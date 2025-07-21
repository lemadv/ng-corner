/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import express from 'express';
import * as path from 'path';

const app = express();

app.use(express.json());
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

// API Routes
app.get('/api', (req, res) => {
  res.send({ message: 'Welcome to blog-be!' });
});

app.get('/api/posts', (req, res) => {
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

const port = process.env.PORT || 3333;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on('error', console.error);
