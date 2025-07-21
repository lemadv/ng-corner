import express, { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { AuthService } from '../utils/auth';
import { passwordResetLimiter, logSecurityEvent } from '../middleware/security';
import { authenticateToken } from '../middleware/auth';
import validator from 'validator';

const router = express.Router();

/**
 * POST /password/forgot
 * Request password reset
 */
router.post('/forgot', passwordResetLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Validate email format
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    // Always return success message for security (don't reveal if user exists)
    const successMessage = 'If an account with this email exists, we\'ll send password reset instructions';

    const user = await UserModel.findByEmail(email.toLowerCase().trim());

    if (!user) {
      // Log security event for non-existent email attempts
      logSecurityEvent('password_reset_attempt_invalid_email', {
        email: email.toLowerCase().trim(),
        ip: req.ip
      }, req);

      return res.json({ message: successMessage });
    }

    // Don't allow password reset for OAuth users
    if (user.provider !== 'local') {
      logSecurityEvent('password_reset_attempt_oauth_user', {
        userId: user.id,
        email: user.email,
        provider: user.provider
      }, req);

      return res.json({ message: successMessage });
    }

    // Generate password reset token
    const resetToken = await UserModel.setPasswordResetToken(user.email);

    if (!resetToken) {
      return res.status(500).json({
        error: 'Reset failed',
        message: 'Unable to generate password reset token'
      });
    }

    // TODO: Send password reset email
    console.log(`Password reset token for ${user.email}: ${resetToken}`);

    // Log security event
    logSecurityEvent('password_reset_requested', {
      userId: user.id,
      email: user.email
    }, req);

    res.json({ message: successMessage });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      error: 'Reset failed',
      message: 'An error occurred while processing password reset request'
    });
  }
});

/**
 * POST /password/reset
 * Reset password with token
 */
router.post('/reset', async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Reset token and new password are required'
      });
    }

    // Validate password strength
    const passwordStrength = AuthService.getPasswordStrength(password);
    if (passwordStrength.score < 4) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password does not meet security requirements',
        requirements: passwordStrength.feedback
      });
    }

    // Reset password
    const user = await UserModel.resetPassword(token, password);

    if (!user) {
      logSecurityEvent('password_reset_invalid_token', {
        token: token.substring(0, 8) + '...', // Log partial token for debugging
        ip: req.ip
      }, req);

      return res.status(400).json({
        error: 'Invalid token',
        message: 'Password reset token is invalid or expired'
      });
    }

    // Log successful password reset
    logSecurityEvent('password_reset_successful', {
      userId: user.id,
      email: user.email
    }, req);

    res.json({
      message: 'Password reset successfully',
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified
      }
    });

  } catch (error) {
    console.error('Password reset error:', error);
    
    if (error.message === 'Password does not meet security requirements') {
      return res.status(400).json({
        error: 'Weak password',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Reset failed',
      message: 'An error occurred while resetting password'
    });
  }
});

/**
 * PUT /password/change
 * Change password for authenticated user
 */
router.put('/change', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Current password and new password are required'
      });
    }

    // Get user details
    const user = await UserModel.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    // Don't allow password change for OAuth users
    if (user.provider !== 'local') {
      return res.status(403).json({
        error: 'Operation not allowed',
        message: 'Password change is not available for social login accounts'
      });
    }

    if (!user.password_hash) {
      return res.status(400).json({
        error: 'No password set',
        message: 'This account does not have a password set'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await AuthService.verifyPassword(currentPassword, user.password_hash);
    
    if (!isCurrentPasswordValid) {
      logSecurityEvent('password_change_invalid_current', {
        userId: user.id,
        email: user.email
      }, req);

      return res.status(400).json({
        error: 'Invalid current password',
        message: 'Current password is incorrect'
      });
    }

    // Validate new password strength
    const passwordStrength = AuthService.getPasswordStrength(newPassword);
    if (passwordStrength.score < 4) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'New password does not meet security requirements',
        requirements: passwordStrength.feedback
      });
    }

    // Check if new password is different from current
    const isSamePassword = await AuthService.verifyPassword(newPassword, user.password_hash);
    if (isSamePassword) {
      return res.status(400).json({
        error: 'Same password',
        message: 'New password must be different from current password'
      });
    }

    // Hash new password and update
    const newPasswordHash = await AuthService.hashPassword(newPassword);
    
    await UserModel.update(user.id, {
      // We can't use password_hash here directly as it's not in UpdateUserData
      // We need to modify this or create a separate method
    });

    // For now, let's use a direct query
    await require('../database/connection').db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, user.id]
    );

    // Log successful password change
    logSecurityEvent('password_change_successful', {
      userId: user.id,
      email: user.email
    }, req);

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    
    if (error.message === 'Password does not meet security requirements') {
      return res.status(400).json({
        error: 'Weak password',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Password change failed',
      message: 'An error occurred while changing password'
    });
  }
});

/**
 * GET /password/strength
 * Check password strength (for frontend validation)
 */
router.post('/strength', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: 'Missing password',
        message: 'Password is required for strength check'
      });
    }

    const strength = AuthService.getPasswordStrength(password);

    // Don't log the actual password for security
    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const strengthLabel = strengthLabels[Math.min(strength.score, strengthLabels.length - 1)];

    res.json({
      score: strength.score,
      label: strengthLabel,
      feedback: strength.feedback,
      isValid: strength.score >= 4
    });

  } catch (error) {
    console.error('Password strength check error:', error);
    res.status(500).json({
      error: 'Strength check failed',
      message: 'An error occurred while checking password strength'
    });
  }
});

export default router;