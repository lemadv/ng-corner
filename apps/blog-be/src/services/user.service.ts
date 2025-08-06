import { User, Provider } from '@prisma/client';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { AuthService, calculateLockoutDuration } from '../utils/auth';
import { formatPrismaError } from '../lib/prisma';

export interface CreateUserData {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  googleId?: string;
  provider?: Provider;
  emailVerified?: boolean;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  profilePicture?: string;
  emailVerified?: boolean;
}

export class UserService {
  /**
   * Create a new user
   */
  static async create(userData: CreateUserData): Promise<User> {
    const {
      email,
      password,
      firstName,
      lastName,
      profilePicture,
      googleId,
      provider = 'LOCAL',
      emailVerified = false
    } = userData;

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password if provided (for local accounts)
      let passwordHash: string | undefined;
      if (password) {
        passwordHash = await AuthService.hashPassword(password);
      }

      // Generate email verification token for local accounts
      let emailVerificationToken: string | undefined;
      let emailVerificationExpires: Date | undefined;
      
      if (provider === 'LOCAL' && !emailVerified) {
        emailVerificationToken = AuthService.generateSecureToken();
        emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      }

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          profilePicture,
          emailVerified,
          emailVerificationToken,
          emailVerificationExpires,
          googleId,
          provider
        }
      });

      return user;
    } catch (error: any) {
      if (error.message === 'User with this email already exists') {
        throw error;
      }
      
      const formattedError = formatPrismaError(error);
      throw new Error(formattedError.message);
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id }
      });
    } catch (error: any) {
      console.error('Error finding user by ID:', error);
      return null;
    }
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { email }
      });
    } catch (error: any) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  /**
   * Find user by Google ID
   */
  static async findByGoogleId(googleId: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { googleId }
      });
    } catch (error: any) {
      console.error('Error finding user by Google ID:', error);
      return null;
    }
  }

  /**
   * Update user data
   */
  static async update(id: string, userData: UpdateUserData): Promise<User | null> {
    try {
      return await prisma.user.update({
        where: { id },
        data: userData
      });
    } catch (error: any) {
      const formattedError = formatPrismaError(error);
      if (formattedError.code === 'NOT_FOUND') {
        return null;
      }
      throw new Error(formattedError.message);
    }
  }

  /**
   * Update password
   */
  static async updatePassword(id: string, newPassword: string): Promise<User | null> {
    try {
      const passwordHash = await AuthService.hashPassword(newPassword);
      
      return await prisma.user.update({
        where: { id },
        data: {
          passwordHash,
          // Reset security fields when password is changed
          failedLoginAttempts: 0,
          accountLockedUntil: null
        }
      });
    } catch (error: any) {
      const formattedError = formatPrismaError(error);
      if (formattedError.code === 'NOT_FOUND') {
        return null;
      }
      throw new Error(formattedError.message);
    }
  }

  /**
   * Verify user login credentials
   */
  static async verifyCredentials(email: string, password: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });
      
      if (!user || !user.passwordHash) {
        return null;
      }

      // Check if account is locked
      if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        throw new Error('Account is temporarily locked due to too many failed login attempts');
      }

      const isValidPassword = await AuthService.verifyPassword(password, user.passwordHash);
      
      if (!isValidPassword) {
        // Increment failed login attempts
        await this.incrementFailedLoginAttempts(user.id);
        return null;
      }

      // Reset failed login attempts and update last login on successful login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          accountLockedUntil: null,
          lastLogin: new Date()
        }
      });

      // Return updated user
      return await prisma.user.findUnique({
        where: { id: user.id }
      });

    } catch (error: any) {
      if (error.message === 'Account is temporarily locked due to too many failed login attempts') {
        throw error;
      }
      console.error('Error verifying credentials:', error);
      return null;
    }
  }

  /**
   * Increment failed login attempts and potentially lock account
   */
  static async incrementFailedLoginAttempts(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) return;

      const newFailedAttempts = user.failedLoginAttempts + 1;
      let accountLockedUntil: Date | null = null;

      // Lock account after 5 failed attempts
      if (newFailedAttempts >= 5) {
        const lockoutDuration = calculateLockoutDuration(newFailedAttempts);
        accountLockedUntil = new Date(Date.now() + lockoutDuration);
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: newFailedAttempts,
          accountLockedUntil
        }
      });
    } catch (error: any) {
      console.error('Error incrementing failed login attempts:', error);
    }
  }

  /**
   * Set email verification token
   */
  static async setEmailVerificationToken(userId: string): Promise<string> {
    try {
      const token = AuthService.generateSecureToken();
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.user.update({
        where: { id: userId },
        data: {
          emailVerificationToken: token,
          emailVerificationExpires: expires
        }
      });

      return token;
    } catch (error: any) {
      const formattedError = formatPrismaError(error);
      throw new Error(formattedError.message);
    }
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<User | null> {
    try {
      // Find user with valid token
      const user = await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpires: {
            gt: new Date()
          }
        }
      });

      if (!user) {
        return null;
      }

      // Mark email as verified and clear verification token
      return await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null
        }
      });
    } catch (error: any) {
      console.error('Error verifying email:', error);
      return null;
    }
  }

  /**
   * Set password reset token
   */
  static async setPasswordResetToken(email: string): Promise<string | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return null;
      }

      const token = AuthService.generateSecureToken();
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: token,
          passwordResetExpires: expires
        }
      });

      return token;
    } catch (error: any) {
      console.error('Error setting password reset token:', error);
      return null;
    }
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<User | null> {
    try {
      // Find user with valid reset token
      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpires: {
            gt: new Date()
          }
        }
      });

      if (!user) {
        return null;
      }

      const passwordHash = await AuthService.hashPassword(newPassword);

      return await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
          failedLoginAttempts: 0,
          accountLockedUntil: null
        }
      });
    } catch (error: any) {
      console.error('Error resetting password:', error);
      return null;
    }
  }

  /**
   * Delete user (soft delete by setting email to deleted state)
   */
  static async delete(id: string): Promise<boolean> {
    try {
      // Instead of hard delete, we could soft delete
      await prisma.user.delete({
        where: { id }
      });
      return true;
    } catch (error: any) {
      const formattedError = formatPrismaError(error);
      if (formattedError.code === 'NOT_FOUND') {
        return false;
      }
      throw new Error(formattedError.message);
    }
  }

  /**
   * Get user's public profile (without sensitive data)
   */
  static async getPublicProfile(id: string): Promise<Partial<User> | null> {
    try {
      return await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          profilePicture: true,
          emailVerified: true,
          provider: true,
          role: true,
          createdAt: true,
          lastLogin: true
        }
      });
    } catch (error: any) {
      console.error('Error getting public profile:', error);
      return null;
    }
  }

  /**
   * Get user statistics
   */
  static async getUserStats(id: string): Promise<{
    refreshTokensCount: number;
    createdAt: Date;
    lastLogin: Date | null;
  } | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          createdAt: true,
          lastLogin: true,
          refreshTokens: {
            where: {
              revoked: false,
              expiresAt: {
                gt: new Date()
              }
            },
            select: { id: true }
          }
        }
      });

      if (!user) return null;

      return {
        refreshTokensCount: user.refreshTokens.length,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      };
    } catch (error: any) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  /**
   * Search users (admin function)
   */
  static async searchUsers(query: string, limit: number = 10, offset: number = 0): Promise<{
    users: Partial<User>[];
    total: number;
  }> {
    try {
      const whereClause = {
        OR: [
          { email: { contains: query, mode: 'insensitive' as const } },
          { firstName: { contains: query, mode: 'insensitive' as const } },
          { lastName: { contains: query, mode: 'insensitive' as const } }
        ]
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            emailVerified: true,
            provider: true,
            createdAt: true,
            lastLogin: true
          },
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where: whereClause })
      ]);

      return { users, total };
    } catch (error: any) {
      console.error('Error searching users:', error);
      return { users: [], total: 0 };
    }
  }
}