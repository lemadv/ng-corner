import { db } from '../database/connection';
import { AuthService, calculateLockoutDuration } from '../utils/auth';
import validator from 'validator';

export interface User {
  id: string;
  email: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  email_verified: boolean;
  email_verification_token?: string;
  email_verification_expires?: Date;
  password_reset_token?: string;
  password_reset_expires?: Date;
  google_id?: string;
  provider: 'local' | 'google';
  failed_login_attempts: number;
  account_locked_until?: Date;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  google_id?: string;
  provider?: 'local' | 'google';
  email_verified?: boolean;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  profile_picture?: string;
  email_verified?: boolean;
}

export class UserModel {
  /**
   * Create a new user
   */
  static async create(userData: CreateUserData): Promise<User> {
    const {
      email,
      password,
      first_name,
      last_name,
      profile_picture,
      google_id,
      provider = 'local',
      email_verified = false
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
    let password_hash: string | undefined;
    if (password) {
      password_hash = await AuthService.hashPassword(password);
    }

    // Generate email verification token for local accounts
    let email_verification_token: string | undefined;
    let email_verification_expires: Date | undefined;
    
    if (provider === 'local' && !email_verified) {
      email_verification_token = AuthService.generateSecureToken();
      email_verification_expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    }

    const query = `
      INSERT INTO users (
        email, password_hash, first_name, last_name, profile_picture,
        email_verified, email_verification_token, email_verification_expires,
        google_id, provider
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      email,
      password_hash,
      first_name,
      last_name,
      profile_picture,
      email_verified,
      email_verification_token,
      email_verification_expires,
      google_id,
      provider
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Find user by email
   */
  static async findByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Find user by Google ID
   */
  static async findByGoogleId(googleId: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE google_id = $1';
    const result = await db.query(query, [googleId]);
    return result.rows[0] || null;
  }

  /**
   * Update user data
   */
  static async update(id: string, userData: UpdateUserData): Promise<User | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let valueIndex = 1;

    // Build dynamic update query
    Object.entries(userData).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${valueIndex}`);
        values.push(value);
        valueIndex++;
      }
    });

    if (updates.length === 0) {
      return await this.findById(id);
    }

    values.push(id); // Add ID as the last parameter
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${valueIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0] || null;
  }

  /**
   * Verify user login credentials
   */
  static async verifyCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    
    if (!user || !user.password_hash) {
      return null;
    }

    // Check if account is locked
    if (user.account_locked_until && user.account_locked_until > new Date()) {
      throw new Error('Account is temporarily locked due to too many failed login attempts');
    }

    const isValidPassword = await AuthService.verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      // Increment failed login attempts
      await this.incrementFailedLoginAttempts(user.id);
      return null;
    }

    // Reset failed login attempts on successful login
    await this.resetFailedLoginAttempts(user.id);
    
    // Update last login timestamp
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    return user;
  }

  /**
   * Increment failed login attempts and potentially lock account
   */
  static async incrementFailedLoginAttempts(userId: string): Promise<void> {
    const user = await this.findById(userId);
    if (!user) return;

    const newFailedAttempts = user.failed_login_attempts + 1;
    let account_locked_until: Date | null = null;

    // Lock account after 5 failed attempts
    if (newFailedAttempts >= 5) {
      const lockoutDuration = calculateLockoutDuration(newFailedAttempts);
      account_locked_until = new Date(Date.now() + lockoutDuration);
    }

    const query = `
      UPDATE users 
      SET failed_login_attempts = $1, account_locked_until = $2
      WHERE id = $3
    `;

    await db.query(query, [newFailedAttempts, account_locked_until, userId]);
  }

  /**
   * Reset failed login attempts
   */
  static async resetFailedLoginAttempts(userId: string): Promise<void> {
    const query = `
      UPDATE users 
      SET failed_login_attempts = 0, account_locked_until = NULL
      WHERE id = $1
    `;

    await db.query(query, [userId]);
  }

  /**
   * Set email verification token
   */
  static async setEmailVerificationToken(userId: string): Promise<string> {
    const token = AuthService.generateSecureToken();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const query = `
      UPDATE users 
      SET email_verification_token = $1, email_verification_expires = $2
      WHERE id = $3
    `;

    await db.query(query, [token, expires, userId]);
    return token;
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<User | null> {
    const query = `
      SELECT * FROM users 
      WHERE email_verification_token = $1 
      AND email_verification_expires > CURRENT_TIMESTAMP
    `;

    const result = await db.query(query, [token]);
    const user = result.rows[0];

    if (!user) {
      return null;
    }

    // Mark email as verified and clear verification token
    const updateQuery = `
      UPDATE users 
      SET email_verified = TRUE, 
          email_verification_token = NULL, 
          email_verification_expires = NULL
      WHERE id = $1
      RETURNING *
    `;

    const updateResult = await db.query(updateQuery, [user.id]);
    return updateResult.rows[0];
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

    const query = `
      UPDATE users 
      SET password_reset_token = $1, password_reset_expires = $2
      WHERE id = $3
    `;

    await db.query(query, [token, expires, user.id]);
    return token;
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<User | null> {
    const query = `
      SELECT * FROM users 
      WHERE password_reset_token = $1 
      AND password_reset_expires > CURRENT_TIMESTAMP
    `;

    const result = await db.query(query, [token]);
    const user = result.rows[0];

    if (!user) {
      return null;
    }

    const password_hash = await AuthService.hashPassword(newPassword);

    const updateQuery = `
      UPDATE users 
      SET password_hash = $1,
          password_reset_token = NULL,
          password_reset_expires = NULL,
          failed_login_attempts = 0,
          account_locked_until = NULL
      WHERE id = $2
      RETURNING *
    `;

    const updateResult = await db.query(updateQuery, [password_hash, user.id]);
    return updateResult.rows[0];
  }

  /**
   * Delete user (soft delete or hard delete based on requirements)
   */
  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Get user's public profile (without sensitive data)
   */
  static async getPublicProfile(id: string): Promise<Partial<User> | null> {
    const query = `
      SELECT id, email, first_name, last_name, profile_picture, 
             email_verified, provider, created_at, last_login
      FROM users 
      WHERE id = $1
    `;

    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }
}