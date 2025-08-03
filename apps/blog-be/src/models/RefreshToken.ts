import { prisma } from '../lib/prisma';
import { AuthService } from '../utils/auth';
import { RefreshToken } from '@prisma/client';

export interface CreateRefreshTokenData {
  userId: string;
  token: string;
  expiresAt: Date;
  deviceInfo?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class RefreshTokenModel {
  /**
   * Create a new refresh token
   */
  static async create(tokenData: CreateRefreshTokenData): Promise<RefreshToken> {
    const {
      userId,
      token,
      expiresAt,
      deviceInfo,
      ipAddress,
      userAgent
    } = tokenData;

    // Hash the token before storing
    const tokenHash = await AuthService.hashRefreshToken(token);

    return await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        deviceInfo,
        ipAddress,
        userAgent
      }
    });
  }

  /**
   * Find refresh token by hashed token
   */
  static async findByToken(token: string): Promise<RefreshToken | null> {
    const tokenHash = await AuthService.hashRefreshToken(token);
    
    return await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        expiresAt: {
          gt: new Date()
        },
        revoked: false
      }
    });
  }

  /**
   * Find all active refresh tokens for a user
   */
  static async findByUserId(userId: string): Promise<RefreshToken[]> {
    return await prisma.refreshToken.findMany({
      where: {
        userId,
        expiresAt: {
          gt: new Date()
        },
        revoked: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Revoke a refresh token
   */
  static async revoke(token: string): Promise<boolean> {
    const tokenHash = await AuthService.hashRefreshToken(token);
    
    try {
      await prisma.refreshToken.updateMany({
        where: {
          tokenHash
        },
        data: {
          revoked: true,
          revokedAt: new Date()
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  static async revokeAllForUser(userId: string): Promise<number> {
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
  }

  /**
   * Clean up expired and revoked tokens
   */
  static async cleanup(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date()
            }
          },
          {
            revoked: true
          }
        ]
      }
    });
    
    return result.count;
  }

  /**
   * Rotate refresh token (revoke old, create new)
   */
  static async rotate(
    oldToken: string,
    newTokenData: CreateRefreshTokenData
  ): Promise<RefreshToken | null> {
    // Use Prisma transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
      // First, verify and revoke the old token
      const oldTokenHash = await AuthService.hashRefreshToken(oldToken);
      
      const oldRefreshToken = await tx.refreshToken.findFirst({
        where: {
          tokenHash: oldTokenHash,
          expiresAt: {
            gt: new Date()
          },
          revoked: false
        }
      });

      if (!oldRefreshToken) {
        throw new Error('Invalid or expired refresh token');
      }

      // Revoke the old token
      await tx.refreshToken.update({
        where: { id: oldRefreshToken.id },
        data: {
          revoked: true,
          revokedAt: new Date()
        }
      });

      // Create the new token
      const newTokenHash = await AuthService.hashRefreshToken(newTokenData.token);
      
      return await tx.refreshToken.create({
        data: {
          userId: newTokenData.userId,
          tokenHash: newTokenHash,
          expiresAt: newTokenData.expiresAt,
          deviceInfo: newTokenData.deviceInfo,
          ipAddress: newTokenData.ipAddress,
          userAgent: newTokenData.userAgent
        }
      });
    });
  }

  /**
   * Get refresh token statistics for a user
   */
  static async getUserTokenStats(userId: string): Promise<{
    activeTokens: number;
    totalTokens: number;
    lastActivity: Date | null;
  }> {
    const [activeTokens, totalTokens, lastActivity] = await Promise.all([
      prisma.refreshToken.count({
        where: {
          userId,
          expiresAt: {
            gt: new Date()
          },
          revoked: false
        }
      }),
      prisma.refreshToken.count({
        where: {
          userId
        }
      }),
      prisma.refreshToken.findFirst({
        where: {
          userId
        },
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          createdAt: true
        }
      })
    ]);

    return {
      activeTokens,
      totalTokens,
      lastActivity: lastActivity?.createdAt || null
    };
  }

  /**
   * Get device sessions for a user
   */
  static async getUserSessions(userId: string): Promise<Array<{
    id: string;
    deviceInfo: any;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    lastUsed: Date;
    isCurrent?: boolean;
  }>> {
    const sessions = await prisma.refreshToken.findMany({
      where: {
        userId,
        expiresAt: {
          gt: new Date()
        },
        revoked: false
      },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return sessions.map(session => ({
      id: session.id,
      deviceInfo: session.deviceInfo,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastUsed: session.updatedAt
    }));
  }
}