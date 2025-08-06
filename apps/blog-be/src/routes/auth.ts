import express, { Request, Response } from 'express';
import { UserService, CreateUserData } from '../services/user.service';
import { RefreshTokenService } from '../services/refresh-token.service';
import { RefreshTokenModel } from '../models/RefreshToken';
import { AuthService } from '../utils/auth';
import { 
  authenticateToken, 
  authenticateRefreshToken,
  requireEmailVerification 
} from '../middleware/auth';
import { 
  authLimiter, 
  passwordResetLimiter, 
  emailVerificationLimiter,
  logSecurityEvent
} from '../middleware/security';
import { validate } from '../middleware/validation';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  refreshTokenSchema
} from '../schemas/auth.schemas';

const router = express.Router();

/**
 * POST /auth/register
 * Register a new user account
 */
router.post('/register', authLimiter, validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    const userData: CreateUserData = {
      email,
      password,
      firstName,
      lastName,
      provider: 'LOCAL'
    };

    // Create user
    const user = await UserService.create(userData);

    // Generate email verification token
    const verificationToken = await UserService.setEmailVerificationToken(user.id);

    // TODO: Send verification email (implement email service)
    console.log(`Email verification token for ${user.email}: ${verificationToken}`);

    // Log security event
    logSecurityEvent('user_registration', {
      userId: user.id,
      email: user.email,
      provider: 'local'
    }, req);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        role: user.role,
        createdAt: user.createdAt
      },
      nextStep: 'Please check your email to verify your account'
    });

  } catch (error) {
    console.error('Registration error:', error);

    if (error.message === 'User with this email already exists') {
      return res.status(409).json({
        error: 'Email already registered',
        message: 'An account with this email already exists'
      });
    }

    res.status(500).json({
      error: 'Registration failed',
      message: 'An error occurred during registration'
    });
  }
});

/**
 * POST /auth/login
 * Authenticate user and return tokens
 */
router.post('/login', authLimiter, validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe = false } = req.body;

    // Verify credentials
    const user = await UserService.verifyCredentials(email, password);

    if (!user) {
      logSecurityEvent('failed_login_attempt', {
        email,
        ip: req.ip
      }, req);

      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
    }

    // Check if email is verified for local accounts
    if (user.provider === 'LOCAL' && !user.emailVerified) {
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email address before logging in',
        action: 'verification_required'
      });
    }

    // Generate tokens
    const tokenPair = await AuthService.generateTokenPair(user.id, user.email);

    // Store refresh token in database
    await RefreshTokenModel.create({
      userId: user.id,
      token: tokenPair.refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Log successful login
    logSecurityEvent('successful_login', {
      userId: user.id,
      email: user.email,
      provider: user.provider
    }, req);

    // Set refresh token in httpOnly cookie for security
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : undefined // 7 days or session
    };

    res.cookie('refreshToken', tokenPair.refreshToken, cookieOptions);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        provider: user.provider,
        role: user.role
      },
      accessToken: tokenPair.accessToken,
      expiresIn: tokenPair.expiresIn
    });

  } catch (error) {
    console.error('Login error:', error);

    if (error.message === 'Account is temporarily locked due to too many failed login attempts') {
      return res.status(423).json({
        error: 'Account locked',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', validate(refreshTokenSchema), authenticateRefreshToken, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const cookieRefreshToken = req.cookies.refreshToken;
    
    // Use refresh token from body or cookie
    const token = refreshToken || cookieRefreshToken;
    
    if (!token || !req.user) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'No valid refresh token provided'
      });
    }

    // Generate new token pair
    const tokenPair = await AuthService.generateTokenPair(req.user.id, req.user.email);

    // Rotate refresh token for security
    const tokenRecord = await RefreshTokenModel.findByToken(token);
    if (tokenRecord) {
      await RefreshTokenModel.rotate(token, {
        userId: req.user.id,
        token: tokenPair.refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    // Update refresh token cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    res.cookie('refreshToken', tokenPair.refreshToken, cookieOptions);

    res.json({
      message: 'Token refreshed successfully',
      accessToken: tokenPair.accessToken,
      expiresIn: tokenPair.expiresIn
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    res.status(401).json({
      error: 'Token refresh failed',
      message: 'Unable to refresh access token'
    });
  }
});

/**
 * POST /auth/logout
 * Logout user and revoke refresh token
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

    if (refreshToken) {
      // Revoke the refresh token
      const tokenRecord = await RefreshTokenModel.findByToken(refreshToken);
      if (tokenRecord) {
        await RefreshTokenModel.revoke(refreshToken);
      }
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    // Log logout event
    logSecurityEvent('user_logout', {
      userId: req.user?.id
    }, req);

    res.json({
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred during logout'
    });
  }
});

/**
 * POST /auth/logout-all
 * Logout from all devices (revoke all refresh tokens)
 */
router.post('/logout-all', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }

    // Revoke all refresh tokens for the user
    const revokedCount = await RefreshTokenModel.revokeAllForUser(req.user.id);

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    // Log security event
    logSecurityEvent('logout_all_devices', {
      userId: req.user.id,
      revokedTokens: revokedCount
    }, req);

    res.json({
      message: 'Logged out from all devices successfully',
      revokedTokens: revokedCount
    });

  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'An error occurred during logout'
    });
  }
});

/**
 * GET /auth/me
 * Get current user profile
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }

    const userProfile = await UserService.getPublicProfile(req.user.id);

    if (!userProfile) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }

    res.json({
      user: userProfile
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Profile fetch failed',
      message: 'Unable to fetch user profile'
    });
  }
});

/**
 * POST /auth/verify-email
 * Verify email address with token
 */
router.post('/verify-email', validate(verifyEmailSchema), async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    const user = await UserService.verifyEmail(token);

    if (!user) {
      return res.status(400).json({
        error: 'Invalid token',
        message: 'Email verification token is invalid or expired'
      });
    }

    // Log security event
    logSecurityEvent('email_verification', {
      userId: user.id,
      email: user.email
    }, req);

    res.json({
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: 'An error occurred during email verification'
    });
  }
});

/**
 * POST /auth/resend-verification
 * Resend email verification
 */
router.post('/resend-verification', emailVerificationLimiter, validate(resendVerificationSchema), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await UserService.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists for security
      return res.json({
        message: 'If an account with this email exists and is unverified, we\'ll send a verification email'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        error: 'Already verified',
        message: 'Email address is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = await UserService.setEmailVerificationToken(user.id);

    // TODO: Send verification email
    console.log(`New verification token for ${user.email}: ${verificationToken}`);

    res.json({
      message: 'If an account with this email exists and is unverified, we\'ll send a verification email'
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: 'An error occurred while sending verification email'
    });
  }
});

export default router;