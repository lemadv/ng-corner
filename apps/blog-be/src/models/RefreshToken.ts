import { db } from '../database/connection';
import { AuthService } from '../utils/auth';

export interface RefreshToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked: boolean;
  revoked_at?: Date;
  device_info?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRefreshTokenData {
  user_id: string;
  token: string;
  expires_at: Date;
  device_info?: any;
  ip_address?: string;
  user_agent?: string;
}

export class RefreshTokenModel {
  /**
   * Create a new refresh token
   */
  static async create(tokenData: CreateRefreshTokenData): Promise<RefreshToken> {
    const {
      user_id,
      token,
      expires_at,
      device_info,
      ip_address,
      user_agent
    } = tokenData;

    // Hash the token before storing
    const token_hash = await AuthService.hashRefreshToken(token);

    const query = `
      INSERT INTO refresh_tokens (
        user_id, token_hash, expires_at, device_info, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      user_id,
      token_hash,
      expires_at,
      device_info ? JSON.stringify(device_info) : null,
      ip_address,
      user_agent
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find refresh token by hashed token
   */
  static async findByToken(token: string): Promise<RefreshToken | null> {
    const token_hash = await AuthService.hashRefreshToken(token);
    
    const query = `
      SELECT * FROM refresh_tokens 
      WHERE token_hash = $1 
      AND expires_at > CURRENT_TIMESTAMP 
      AND revoked = FALSE
    `;

    const result = await db.query(query, [token_hash]);
    return result.rows[0] || null;
  }

  /**
   * Find all active refresh tokens for a user
   */
  static async findByUserId(userId: string): Promise<RefreshToken[]> {
    const query = `
      SELECT * FROM refresh_tokens 
      WHERE user_id = $1 
      AND expires_at > CURRENT_TIMESTAMP 
      AND revoked = FALSE
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Revoke a refresh token
   */
  static async revoke(token: string): Promise<boolean> {
    const token_hash = await AuthService.hashRefreshToken(token);
    
    const query = `
      UPDATE refresh_tokens 
      SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
      WHERE token_hash = $1
    `;

    const result = await db.query(query, [token_hash]);
    return result.rowCount > 0;
  }

  /**
   * Revoke all refresh tokens for a user
   */
  static async revokeAllForUser(userId: string): Promise<number> {
    const query = `
      UPDATE refresh_tokens 
      SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND revoked = FALSE
    `;

    const result = await db.query(query, [userId]);
    return result.rowCount;
  }

  /**
   * Clean up expired and revoked tokens
   */
  static async cleanup(): Promise<number> {
    const query = `
      DELETE FROM refresh_tokens 
      WHERE expires_at < CURRENT_TIMESTAMP OR revoked = TRUE
    `;

    const result = await db.query(query);
    return result.rowCount;
  }

  /**
   * Rotate refresh token (revoke old, create new)
   */
  static async rotate(
    oldToken: string,
    newTokenData: CreateRefreshTokenData
  ): Promise<RefreshToken | null> {
    // Use transaction to ensure atomicity
    return await db.transaction(async (client) => {
      // First, verify and revoke the old token
      const oldTokenHash = await AuthService.hashRefreshToken(oldToken);
      
      const oldTokenQuery = `
        SELECT * FROM refresh_tokens 
        WHERE token_hash = $1 
        AND expires_at > CURRENT_TIMESTAMP 
        AND revoked = FALSE
      `;

      const oldTokenResult = await client.query(oldTokenQuery, [oldTokenHash]);
      const oldRefreshToken = oldTokenResult.rows[0];

      if (!oldRefreshToken) {
        throw new Error('Invalid or expired refresh token');
      }

      // Revoke the old token
      await client.query(
        'UPDATE refresh_tokens SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP WHERE id = $1',
        [oldRefreshToken.id]
      );

      // Create the new token
      const newTokenHash = await AuthService.hashRefreshToken(newTokenData.token);
      
      const newTokenQuery = `
        INSERT INTO refresh_tokens (
          user_id, token_hash, expires_at, device_info, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const newTokenValues = [
        newTokenData.user_id,
        newTokenHash,
        newTokenData.expires_at,
        newTokenData.device_info ? JSON.stringify(newTokenData.device_info) : null,
        newTokenData.ip_address,
        newTokenData.user_agent
      ];

      const newTokenResult = await client.query(newTokenQuery, newTokenValues);
      return newTokenResult.rows[0];
    });
  }

  /**
   * Get refresh token statistics for a user
   */
  static async getUserTokenStats(userId: string): Promise<{
    active_tokens: number;
    total_tokens: number;
    last_activity: Date | null;
  }> {
    const query = `
      SELECT 
        COUNT(*) FILTER (WHERE expires_at > CURRENT_TIMESTAMP AND revoked = FALSE) as active_tokens,
        COUNT(*) as total_tokens,
        MAX(created_at) as last_activity
      FROM refresh_tokens 
      WHERE user_id = $1
    `;

    const result = await db.query(query, [userId]);
    const stats = result.rows[0];

    return {
      active_tokens: parseInt(stats.active_tokens),
      total_tokens: parseInt(stats.total_tokens),
      last_activity: stats.last_activity
    };
  }

  /**
   * Get device sessions for a user
   */
  static async getUserSessions(userId: string): Promise<Array<{
    id: string;
    device_info: any;
    ip_address: string;
    user_agent: string;
    created_at: Date;
    last_used: Date;
    is_current?: boolean;
  }>> {
    const query = `
      SELECT 
        id,
        device_info,
        ip_address,
        user_agent,
        created_at,
        updated_at as last_used
      FROM refresh_tokens 
      WHERE user_id = $1 
      AND expires_at > CURRENT_TIMESTAMP 
      AND revoked = FALSE
      ORDER BY updated_at DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows.map(row => ({
      ...row,
      device_info: row.device_info ? JSON.parse(row.device_info) : null
    }));
  }
}