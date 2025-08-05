import { z } from 'zod';

// Common schemas
export const slugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(255, 'Slug must be less than 255 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens only')
  .trim();

export const titleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(255, 'Title must be less than 255 characters')
  .trim();

export const contentSchema = z
  .string()
  .min(1, 'Content is required');

export const excerptSchema = z
  .string()
  .max(1000, 'Excerpt must be less than 1000 characters')
  .trim()
  .optional();

export const metaTitleSchema = z
  .string()
  .max(255, 'Meta title must be less than 255 characters')
  .trim()
  .optional();

export const metaDescriptionSchema = z
  .string()
  .max(500, 'Meta description must be less than 500 characters')
  .trim()
  .optional();

// Create Post Schema
export const createPostSchema = z.object({
  title: titleSchema,
  slug: slugSchema,
  content: contentSchema,
  excerpt: excerptSchema,
  published: z.boolean().default(false),
  metaTitle: metaTitleSchema,
  metaDescription: metaDescriptionSchema,
  tags: z.array(z.string().uuid('Invalid tag ID')).optional()
});

// Update Post Schema
export const updatePostSchema = z.object({
  title: titleSchema.optional(),
  slug: slugSchema.optional(),
  content: contentSchema.optional(),
  excerpt: excerptSchema,
  published: z.boolean().optional(),
  metaTitle: metaTitleSchema,
  metaDescription: metaDescriptionSchema,
  tags: z.array(z.string().uuid('Invalid tag ID')).optional()
});

// Get Posts Query Schema
export const getPostsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().max(255).optional(),
  tag: z.string().max(100).optional(),
  status: z.enum(['published', 'draft', 'all']).optional()
});

// Get Single Post Schema
export const getPostBySlugSchema = z.object({
  slug: slugSchema
});

// Post Status Update Schema
export const updatePostStatusSchema = z.object({
  published: z.boolean()
});

// Tag-related schemas
export const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50, 'Tag name must be less than 50 characters'),
  slug: z.string().min(1, 'Tag slug is required').max(50, 'Tag slug must be less than 50 characters').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Tag slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional()
});

export const updateTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required').max(50, 'Tag name must be less than 50 characters').optional(),
  slug: z.string().min(1, 'Tag slug is required').max(50, 'Tag slug must be less than 50 characters').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Tag slug must be lowercase letters, numbers, and hyphens only').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional()
});

// Type exports for TypeScript
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type GetPostsInput = z.infer<typeof getPostsSchema>;
export type GetPostBySlugInput = z.infer<typeof getPostBySlugSchema>;
export type UpdatePostStatusInput = z.infer<typeof updatePostStatusSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;