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
import { db } from './database/connection';
import authRoutes from './routes/auth';
import passwordRoutes from './routes/password';
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

// Mock blog posts data
const mockPosts = Array.from({ length: 50 }, (_, i) => ({
  id: `post-${i + 1}`,
  title: `Understanding ${getTechTopic(i)} - Part ${i + 1}`,
  author: getRandomAuthor(i),
  createdDate: new Date(2024, 0, 1 + i * 3).toISOString(),
  modifiedDate: new Date(2024, 0, 1 + i * 3 + Math.floor(Math.random() * 30)).toISOString(),
  content: getRandomContent(i),
  excerpt: getRandomExcerpt(i),
  tags: getRandomTags(i),
  published: true
}));

function getTechTopic(index: number): string {
  const topics = [
    'Angular Signals', 'TypeScript Advanced Features', 'RxJS Operators', 'Angular Performance',
    'State Management', 'Testing Strategies', 'Component Architecture', 'Reactive Programming',
    'Web Components', 'Micro Frontends', 'PWA Development', 'GraphQL Integration',
    'Server-Side Rendering', 'Angular Universal', 'Standalone Components', 'NgRx Signal Store',
    'Angular Material', 'CDK Features', 'Forms Validation', 'HTTP Interceptors'
  ];
  return topics[index % topics.length];
}

function getRandomAuthor(index: number): string {
  const authors = ['John Smith', 'Sarah Connor', 'Mike Johnson', 'Lisa Chen', 'David Wilson', 'Emma Davis', 'Alex Rodriguez'];
  return authors[index % authors.length];
}

function getRandomContent(index: number): string {
  const contents = [
    'Angular Signals represent a revolutionary approach to reactive programming in Angular applications. They provide a declarative way to manage state changes and automatically update the UI when dependencies change. This comprehensive guide explores the fundamentals of Angular Signals, their benefits over traditional approaches, and practical implementation strategies.',
    'TypeScript continues to evolve with powerful features that enhance developer productivity and code quality. From advanced type manipulations to utility types, understanding these features is crucial for building robust applications. We\'ll dive deep into conditional types, mapped types, and template literal types.',
    'RxJS operators are the building blocks of reactive programming in Angular. Mastering operators like switchMap, mergeMap, and concatMap is essential for handling complex asynchronous scenarios. This article provides practical examples and best practices for operator usage.',
    'Performance optimization in Angular applications requires understanding change detection, lazy loading, and bundle optimization. We\'ll explore OnPush change detection strategy, track by functions, and various performance monitoring techniques.',
    'Modern state management solutions in Angular have evolved beyond traditional approaches. From NgRx to Akita to the new Signal Store, choosing the right state management library depends on your application\'s complexity and requirements.'
  ];
  return contents[index % contents.length] + ` This is post number ${index + 1} with additional content to make it unique and searchable.`;
}

function getRandomExcerpt(index: number): string {
  return `A comprehensive guide to ${getTechTopic(index)} covering essential concepts and practical implementation strategies.`;
}

function getRandomTags(index: number): string[] {
  const allTags = ['angular', 'typescript', 'rxjs', 'performance', 'testing', 'architecture', 'state-management', 'components'];
  const numTags = 2 + (index % 3);
  return allTags.slice(index % 4, (index % 4) + numTags);
}

// Initialize database connection and run migrations
async function initializeDatabase() {
  try {
    await db.runMigrations();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Authentication routes
app.use('/api/auth', authRoutes);
app.use('/api/password', passwordRoutes);

// API Routes
app.get('/api', (req, res) => {
  res.send({ 
    message: 'Welcome to NG-Corner Blog API!',
    version: '2.0.0',
    features: ['Authentication', 'Blog Posts', 'User Management'],
    documentation: '/api/docs'
  });
});

app.get('/api/posts', optionalAuth, (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const search = req.query.search as string || '';
  
  let filteredPosts = mockPosts;
  
  // Filter by search term
  if (search) {
    const searchLower = search.toLowerCase();
    filteredPosts = mockPosts.filter(post => 
      post.title.toLowerCase().includes(searchLower) ||
      post.content.toLowerCase().includes(searchLower) ||
      post.author.toLowerCase().includes(searchLower) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  }
  
  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedPosts = filteredPosts.slice(startIndex, endIndex);
  
  // Simulate network delay
  setTimeout(() => {
    res.json({
      posts: paginatedPosts,
      pagination: {
        page,
        limit,
        total: filteredPosts.length,
        totalPages: Math.ceil(filteredPosts.length / limit),
        hasMore: endIndex < filteredPosts.length
      }
    });
  }, 300 + Math.random() * 200); // 300-500ms delay
});

app.get('/api/posts/:id', (req, res) => {
  const post = mockPosts.find(p => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  res.json(post);
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
        await db.close();
        console.log('✅ Database connections closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      server.close(async () => {
        console.log('✅ Server closed');
        await db.close();
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
