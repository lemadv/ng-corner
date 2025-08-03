import { RefreshToken } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuthService } from '../utils/auth';
import { formatPrismaError } from '../lib/prisma';

export interface CreateRefreshTokenData {
  userId: string;
  deviceInfo?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class RefreshTokenService {
  /**
   * Create a new refresh token
   */
  static async create(data: CreateRefreshTokenData): Promise<{ token: string; tokenRecord: RefreshToken }> {
    const { userId, deviceInfo, ipAddress, userAgent } = data;

    try {
      // Generate refresh token
      const token = AuthService.generateSecureToken();
      const tokenHash = AuthService.hashRefreshToken(token);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const tokenRecord = await prisma.refreshToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt,
          deviceInfo,
          ipAddress,
          userAgent
        }
      });

      return { token, tokenRecord };
    } catch (error: any) {
      const formattedError = formatPrismaError(error);
      throw new Error(`Failed to create refresh token: ${formattedError.message}`);
    }
  }

  /**
   * Find refresh token by hash
   */
  static async findByHash(tokenHash: string): Promise<RefreshToken | null> {
    try {
      return await prisma.refreshToken.findFirst({
        where: {
          tokenHash,
          revoked: false,
          expiresAt: {
            gt: new Date()
          }
        },
        include: {
          user: true
        }
      });
    } catch (error: any) {
      console.error('Error finding refresh token by hash:', error);
      return null;
    }
  }

  /**
   * Verify and get refresh token by raw token
   */
  static async verifyToken(token: string): Promise<RefreshToken | null> {
    try {
      const tokenHash = AuthService.hashRefreshToken(token);
      return await this.findByHash(tokenHash);
    } catch (error: any) {
      console.error('Error verifying refresh token:', error);
      return null;
    }
  }

  /**
   * Revoke a refresh token
   */
  static async revoke(tokenId: string): Promise<boolean> {
    try {
      await prisma.refreshToken.update({
        where: { id: tokenId },
        data: {
          revoked: true,
          revokedAt: new Date()
        }
      });
      return true;
    } catch (error: any) {
      const formattedError = formatPrismaError(error);
      if (formattedError.code === 'NOT_FOUND') {
        return false;
      }
      throw new Error(`Failed to revoke refresh token: ${formattedError.message}`);
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  static async revokeAllForUser(userId: string): Promise<number> {
    try {
      const result = await prisma.refreshToken.updateMany({
        where: {
          userId,
          revoked: false
        },
        data: {
          revoked: true,
          revokedAt: new Date()
        }
      });

      return result.count;
    } catch (error: any) {
      console.error('Error revoking all refresh tokens for user:', error);
      throw new Error('Failed to revoke user refresh tokens');
    }
  }

  /**
   * Clean up expired tokens
   */
  static async cleanupExpired(): Promise<number> {
    try {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { revoked: true, revokedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // Remove revoked tokens older than 7 days
          ]
        }
      });

      return result.count;
    } catch (error: any) {
      console.error('Error cleaning up expired refresh tokens:', error);
      return 0;
    }
  }

  /**
   * Get all active refresh tokens for a user
   */
  static async getActiveTokensForUser(userId: string): Promise<Partial<RefreshToken>[]> {
    try {
      return await prisma.refreshToken.findMany({
        where: {
          userId,
          revoked: false,
          expiresAt: {
            gt: new Date()
          }
        },
        select: {
          id: true,
          deviceInfo: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          expiresAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error: any) {
      console.error('Error getting active tokens for user:', error);
      return [];
    }
  }

  /**
   * Rotate refresh token (revoke old and create new)
   */
  static async rotate(oldTokenId: string, data: CreateRefreshTokenData): Promise<{ token: string; tokenRecord: RefreshToken } | null> {
    try {
      // Use transaction to ensure atomicity
      return await prisma.$transaction(async (tx) => {
        // Revoke old token
        await tx.refreshToken.update({
          where: { id: oldTokenId },
          data: {
            revoked: true,
            revokedAt: new Date()
          }
        });

        // Create new token
        const token = AuthService.generateSecureToken();
        const tokenHash = AuthService.hashRefreshToken(token);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const tokenRecord = await tx.refreshToken.create({
          data: {
            userId: data.userId,
            tokenHash,
            expiresAt,
            deviceInfo: data.deviceInfo,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent
          }
        });

        return { token, tokenRecord };
      });
    } catch (error: any) {
      const formattedError = formatPrismaError(error);
      throw new Error(`Failed to rotate refresh token: ${formattedError.message}`);
    }
  }

  /**
   * Get refresh token statistics
   */
  static async getTokenStats(): Promise<{
    totalActive: number;
    totalExpired: number;
    totalRevoked: number;
  }> {
    try {
      const now = new Date();
      
      const [totalActive, totalExpired, totalRevoked] = await Promise.all([
        prisma.refreshToken.count({
          where: {
            revoked: false,
            expiresAt: { gt: now }
          }
        }),
        prisma.refreshToken.count({
          where: {
            revoked: false,
            expiresAt: { lte: now }
          }
        }),
        prisma.refreshToken.count({
          where: { revoked: true }
        })
      ]);

      return {
        totalActive,
        totalExpired,
        totalRevoked
      };
    } catch (error: any) {
      console.error('Error getting token stats:', error);
      return {
        totalActive: 0,
        totalExpired: 0,
        totalRevoked: 0
      };
    }
  }

  /**
   * Update device info for a refresh token
   */
  static async updateDeviceInfo(tokenId: string, deviceInfo: any, ipAddress?: string): Promise<boolean> {
    try {
      await prisma.refreshToken.update({
        where: { id: tokenId },
        data: {
          deviceInfo,
          ipAddress
        }
      });
      return true;
    } catch (error: any) {
      const formattedError = formatPrismaError(error);
      if (formattedError.code === 'NOT_FOUND') {
        return false;
      }
      console.error('Error updating device info:', error);
      return false;
    }
  }
}