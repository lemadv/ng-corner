import { prisma } from '../lib/prisma';
import { AuthService, calculateLockoutDuration } from '../utils/auth';
import { User, Provider } from '@prisma/client';
import validator from 'validator';

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
  timezone?: string;
}

export class UserModel {
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
      provider = Provider.LOCAL,
      emailVerified = false
    } = userData;

    // Validate email
    if (!validator.isEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Check if user already exists
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password if provided (for local accounts)
    let passwordHash: string | null = null;
    if (password) {
      passwordHash = await AuthService.hashPassword(password);
    }

    // Generate email verification token for local accounts
    let emailVerificationToken: string | null = null;
    let emailVerificationExpires: Date | null = null;
    
    if (provider === Provider.LOCAL && !emailVerified) {
      emailVerificationToken = AuthService.generateSecureToken();
      emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    }

    return await prisma.user.create({
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
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id }
    });
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { email }
    });
  }

  /**
   * Find user by Google ID
   */
  static async findByGoogleId(googleId: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { googleId }
    });
  }

  /**
   * Update user data
   */
  static async update(id: string, userData: UpdateUserData): Promise<User | null> {
    // Filter out undefined values
    const cleanData = Object.fromEntries(
      Object.entries(userData).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(cleanData).length === 0) {
      return await this.findById(id);
    }

    return await prisma.user.update({
      where: { id },
      data: cleanData
    });
  }

  /**
   * Verify user login credentials
   */
  static async verifyCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    
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

    // Reset failed login attempts on successful login
    await this.resetFailedLoginAttempts(user.id);
    
    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    return user;
  }

  /**
   * Increment failed login attempts and potentially lock account
   */
  static async incrementFailedLoginAttempts(userId: string): Promise<void> {
    const user = await this.findById(userId);
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
  }

  /**
   * Reset failed login attempts
   */
  static async resetFailedLoginAttempts(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        accountLockedUntil: null
      }
    });
  }

  /**
   * Set email verification token
   */
  static async setEmailVerificationToken(userId: string): Promise<string> {
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
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<User | null> {
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
  }

  /**
   * Set password reset token
   */
  static async setPasswordResetToken(email: string): Promise<string | null> {
    const user = await this.findByEmail(email);
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
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<User | null> {
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
  }

  /**
   * Delete user (soft delete or hard delete based on requirements)
   */
  static async delete(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's public profile (without sensitive data)
   */
  static async getPublicProfile(id: string): Promise<Partial<User> | null> {
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
        createdAt: true,
        lastLogin: true,
      }
    });
  }
}