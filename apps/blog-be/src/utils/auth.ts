import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Types
export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Configuration
const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
const MIN_PASSWORD_LENGTH = 8;

// Password validation regex - at least one uppercase, lowercase, number, and special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

export class AuthService {
  private static jwtSecret = process.env.JWT_SECRET;
  private static refreshSecret = process.env.JWT_REFRESH_SECRET;

  static {
    if (!AuthService.jwtSecret || !AuthService.refreshSecret) {
      throw new Error('JWT secrets must be set in environment variables');
    }
  }

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    if (!this.isPasswordValid(password)) {
      throw new Error('Password does not meet security requirements');
    }
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   */
  static isPasswordValid(password: string): boolean {
    if (password.length < MIN_PASSWORD_LENGTH) {
      return false;
    }
    return PASSWORD_REGEX.test(password);
  }

  /**
   * Generate access and refresh token pair
   */
  static async generateTokenPair(userId: string, email: string): Promise<TokenPair> {
    const tokenId = uuidv4();
    
    const accessToken = jwt.sign(
      { userId, email } as JWTPayload,
      AuthService.jwtSecret!,
      { 
        expiresIn: ACCESS_TOKEN_EXPIRY,
        issuer: 'ng-corner-blog',
        audience: 'ng-corner-users'
      }
    );

    const refreshToken = jwt.sign(
      { userId, tokenId } as RefreshTokenPayload,
      AuthService.refreshSecret!,
      { 
        expiresIn: REFRESH_TOKEN_EXPIRY,
        issuer: 'ng-corner-blog',
        audience: 'ng-corner-users'
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60 * 1000 // 15 minutes in milliseconds
    };
  }

  /**
   * Verify and decode access token
   */
  static async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const decoded = jwt.verify(token, AuthService.jwtSecret!, {
        issuer: 'ng-corner-blog',
        audience: 'ng-corner-users'
      }) as JWTPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      }
      throw new Error('Token verification failed');
    }
  }

  /**
   * Verify and decode refresh token
   */
  static async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const decoded = jwt.verify(token, AuthService.refreshSecret!, {
        issuer: 'ng-corner-blog',
        audience: 'ng-corner-users'
      }) as RefreshTokenPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw new Error('Refresh token verification failed');
    }
  }

  /**
   * Generate secure random token for email verification, password reset, etc.
   */
  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash refresh token for storage
   */
  static async hashRefreshToken(token: string): Promise<string> {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Generate password strength score
   */
  static getPasswordStrength(password: string): {
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length >= MIN_PASSWORD_LENGTH) {
      score += 1;
    } else {
      feedback.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
    }

    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password must contain at least one lowercase letter');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password must contain at least one uppercase letter');
    }

    if (/\d/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password must contain at least one number');
    }

    if (/[@$!%*?&]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Password must contain at least one special character (@$!%*?&)');
    }

    if (password.length >= 12) {
      score += 1;
    }

    return { score, feedback };
  }
}

// Rate limiting helper
export const createRateLimitKey = (prefix: string, identifier: string): string => {
  return `${prefix}:${identifier}`;
};

// Account lockout helper
export const calculateLockoutDuration = (failedAttempts: number): number => {
  // Exponential backoff: 5 minutes, 15 minutes, 30 minutes, 1 hour, etc.
  const baseMinutes = 5;
  const exponential = Math.pow(2, Math.min(failedAttempts - 3, 6));
  return baseMinutes * exponential * 60 * 1000; // Convert to milliseconds
};