/**
 * Blog Backend API Server with Authentication
 * Production-ready Express server with JWT authentication, PostgreSQL, and security middleware
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as path from 'path';

// Import our custom modules
import { connectDatabase, disconnectDatabase, checkDatabaseHealth, runMigrations } from './lib/prisma';
import authRoutes from './routes/auth';
import passwordRoutes from './routes/password';
import postsRoutes from './routes/posts';
import {
  apiLimiter,
  validateRequestBody,
  securityHeaders,
  detectSuspiciousActivity,
  getCorsOptions
} from './middleware/security';
import { optionalAuth } from './middleware/auth';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors(getCorsOptions()));
app.use(securityHeaders);
app.use(detectSuspiciousActivity);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request validation
app.use(validateRequestBody);

// Rate limiting
app.use(apiLimiter);

// Static files
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Initialize database connection, run migrations, and check health
async function initializeDatabase() {
  try {
    await connectDatabase();

    // Run migrations
    //await runMigrations();

    const isHealthy = await checkDatabaseHealth();
    if (!isHealthy) {
      throw new Error('Database health check failed');
    }
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Authentication routes
app.use('/auth', authRoutes);
app.use('/password', passwordRoutes);

// Blog posts routes
app.use('/posts', postsRoutes);

// API Routes
app.get('/', (req, res) => {
  res.send({
    message: 'Welcome to NG-Corner Blog API!',
    version: '2.0.0',
    features: ['Authentication', 'Blog Posts', 'User Management'],
    documentation: '/api/docs'
  });
});


// Error handling middleware (should be last)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

// Start server
async function startServer() {
  try {
    // Initialize database first
    await initializeDatabase();

    const port = process.env.PORT || 3333;
    const server = app.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
      console.log(`📚 API documentation: http://localhost:${port}/api`);
      console.log(`🔐 Authentication endpoints: http://localhost:${port}/api/auth`);
      console.log(`🔑 Password endpoints: http://localhost:${port}/api/password`);
      console.log(`📝 Blog posts: http://localhost:${port}/api/posts`);
    });

    server.on('error', (error) => {
      console.error('❌ Server error:', error);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully...');
      server.close(async () => {
        console.log('✅ Server closed');
        await disconnectDatabase();
        console.log('✅ Database connections closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      server.close(async () => {
        console.log('✅ Server closed');
        await disconnectDatabase();
        console.log('✅ Database connections closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
