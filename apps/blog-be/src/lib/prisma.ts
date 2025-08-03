import { PrismaClient } from '@prisma/client';

// Global variable to prevent multiple instances in development
declare global {
  var __prisma: PrismaClient | undefined;
}

// Prisma Client singleton
export const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

// Connection management
export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Prisma connected to database successfully');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
}

// Run database migrations
export async function runMigrations() {
  try {
    const { execSync } = require('child_process');
    
    console.log('🔄 Running database migrations...');
    
    // Run migrations using Prisma CLI
    const schemaPath = process.env.NODE_ENV === 'production' 
      ? './prisma/schema.prisma'
      : './apps/blog-be/prisma/schema.prisma';
    
    execSync(`npx prisma migrate deploy --schema=${schemaPath}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env }
    });
    
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Failed to run database migrations:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('✅ Prisma disconnected from database successfully');
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error);
  }
}

// Health check function
export async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Transaction helper
export async function executeTransaction<T>(
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(fn);
}

// Query performance logging
export function enableQueryLogging() {
  if (process.env.NODE_ENV === 'development') {
    prisma.$use(async (params, next) => {
      const before = Date.now();
      const result = await next(params);
      const after = Date.now();
      
      const duration = after - before;
      if (duration > 100) { // Log slow queries (> 100ms)
        console.log(`🐌 Slow Query: ${params.model}.${params.action} took ${duration}ms`);
      }
      
      return result;
    });
  }
}

// Error handling middleware
export function setupPrismaErrorHandling() {
  process.on('beforeExit', async () => {
    await disconnectDatabase();
  });

  process.on('SIGINT', async () => {
    await disconnectDatabase();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

// Database seeding utilities (for development)
export async function clearDatabase() {
  if (process.env.NODE_ENV !== 'production') {
    try {
      // Delete in order to respect foreign key constraints
      await prisma.blogPostTag.deleteMany();
      await prisma.blogPost.deleteMany();
      await prisma.tag.deleteMany();
      await prisma.refreshToken.deleteMany();
      await prisma.user.deleteMany();
      console.log('🗑️ Database cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear database:', error);
      throw error;
    }
  } else {
    throw new Error('Database clearing is not allowed in production');
  }
}

// Utility function to format Prisma errors
export function formatPrismaError(error: any): { message: string; code?: string } {
  if (error.code) {
    switch (error.code) {
      case 'P2002':
        return {
          message: 'A record with this information already exists',
          code: 'UNIQUE_CONSTRAINT'
        };
      case 'P2025':
        return {
          message: 'Record not found',
          code: 'NOT_FOUND'
        };
      case 'P2003':
        return {
          message: 'Foreign key constraint violation',
          code: 'FOREIGN_KEY_CONSTRAINT'
        };
      case 'P2016':
        return {
          message: 'Query interpretation error',
          code: 'QUERY_INTERPRETATION_ERROR'
        };
      default:
        return {
          message: 'Database operation failed',
          code: error.code
        };
    }
  }

  return {
    message: error.message || 'An unexpected database error occurred'
  };
}

// Initialize Prisma with all middleware and error handling
export function initializePrisma() {
  enableQueryLogging();
  setupPrismaErrorHandling();
  return prisma;
}

// Export initialized instance
export default initializePrisma();