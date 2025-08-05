import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../utils/auth';
import { UserModel } from '../models/User';
import { RefreshTokenModel } from '../models/RefreshToken';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        email_verified: boolean;
        provider: string;
        role: string;
      };
      tokenPayload?: any;
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthService.extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
      return;
    }

    // Verify the token
    const decoded = await AuthService.verifyAccessToken(token);
    
    // Fetch user details to ensure user still exists and is valid
    const user = await UserModel.findById(decoded.userId);
    
    if (!user) {
      res.status(401).json({
        error: 'Access denied',
        message: 'User not found'
      });
      return;
    }

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      res.status(423).json({
        error: 'Account locked',
        message: 'Account is temporarily locked'
      });
      return;
    }

    // Add user info to request
    req.user = {
      id: user.id,
      email: user.email,
      email_verified: user.emailVerified,
      provider: user.provider,
      role: user.role
    };
    req.tokenPayload = decoded;

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    
    if (error.message === 'Access token expired') {
      res.status(401).json({
        error: 'Token expired',
        message: 'Access token has expired'
      });
    } else if (error.message === 'Invalid access token') {
      res.status(401).json({
        error: 'Invalid token',
        message: 'Invalid access token'
      });
    } else {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Token verification failed'
      });
    }
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = AuthService.extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = await AuthService.verifyAccessToken(token);
      const user = await UserModel.findById(decoded.userId);
      
      if (user && (!user.accountLockedUntil || user.accountLockedUntil <= new Date())) {
        req.user = {
          id: user.id,
          email: user.email,
          email_verified: user.emailVerified,
          provider: user.provider,
          role: user.role
        };
        req.tokenPayload = decoded;
      }
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    next();
  }
};

/**
 * Require email verification middleware
 */
export const requireEmailVerification = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.email_verified) {
    res.status(403).json({
      error: 'Email not verified',
      message: 'Please verify your email address to access this resource'
    });
    return;
  }
  next();
};

/**
 * Refresh token middleware - for token refresh endpoints
 */
export const authenticateRefreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(401).json({
        error: 'Refresh token required',
        message: 'No refresh token provided'
      });
      return;
    }

    // Verify refresh token
    const decoded = await AuthService.verifyRefreshToken(refreshToken);
    
    // Check if refresh token exists in database and is valid
    const tokenRecord = await RefreshTokenModel.findByToken(refreshToken);
    
    if (!tokenRecord) {
      res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Refresh token not found or expired'
      });
      return;
    }

    // Verify user still exists
    const user = await UserModel.findById(decoded.userId);
    
    if (!user) {
      res.status(401).json({
        error: 'User not found',
        message: 'Associated user not found'
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      email_verified: user.emailVerified,
      provider: user.provider,
      role: user.role
    };
    req.tokenPayload = decoded;

    next();
  } catch (error) {
    console.error('Refresh token authentication error:', error.message);
    
    if (error.message === 'Refresh token expired') {
      res.status(401).json({
        error: 'Refresh token expired',
        message: 'Refresh token has expired'
      });
    } else {
      res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Refresh token verification failed'
      });
    }
  }
};

/**
 * Legacy role-based access control (deprecated - use requireRole below)
 */
export const requireRoleLegacy = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // This can be expanded when user roles are implemented
    // For now, all authenticated users have the same permissions
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Please login to access this resource'
      });
      return;
    }
    
    next();
  };
};

/**
 * Check if user owns the resource (for user-specific operations)
 */
export const requireOwnership = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const resourceUserId = req.params.userId || req.body.userId;
  
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required',
      message: 'Please login to access this resource'
    });
    return;
  }

  if (req.user.id !== resourceUserId) {
    res.status(403).json({
      error: 'Access forbidden',
      message: 'You can only access your own resources'
    });
    return;
  }

  next();
};

/**
 * Role-based access control middleware
 * Requires specific roles to access the endpoint
 */
export const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'You must be logged in to access this resource'
        });
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({
          error: 'Access denied',
          message: `This resource requires one of the following roles: ${allowedRoles.join(', ')}`
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({
        error: 'Authorization error',
        message: 'An error occurred while checking permissions'
      });
    }
  };
};

/**
 * Author-only access middleware (shorthand for requireRole(['AUTHOR', 'ADMIN']))
 */
export const requireAuthor = requireRole(['AUTHOR', 'ADMIN']);

/**
 * Admin-only access middleware
 */
export const requireAdmin = requireRole(['ADMIN']);