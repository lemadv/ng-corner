import { BlogPost, Tag, User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { formatPrismaError } from '../lib/prisma';

export interface CreatePostData {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  published?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  authorId: string;
  tags?: string[];
}

export interface UpdatePostData {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  published?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
}

export interface GetPostsOptions {
  page: number;
  limit: number;
  search?: string;
  tag?: string;
}

export interface GetAuthorPostsOptions {
  page: number;
  limit: number;
  status?: 'published' | 'draft' | 'all';
}

export interface PostWithAuthor extends BlogPost {
  author: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  tags: Array<{
    tag: Tag;
  }>;
}

export interface PostsResponse {
  posts: PostWithAuthor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class PostService {
  /**
   * Get all published posts (public endpoint)
   */
  static async getPublishedPosts(options: GetPostsOptions): Promise<PostsResponse> {
    const { page, limit, search, tag } = options;
    const skip = (page - 1) * limit;

    try {
      const whereClause: any = {
        published: true,
        publishedAt: {
          not: null
        }
      };

      if (search) {
        whereClause.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { excerpt: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (tag) {
        whereClause.tags = {
          some: {
            tag: {
              OR: [
                { slug: tag },
                { name: { contains: tag, mode: 'insensitive' } }
              ]
            }
          }
        };
      }

      const [posts, total] = await Promise.all([
        prisma.blogPost.findMany({
          where: whereClause,
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            tags: {
              include: {
                tag: true
              }
            }
          },
          orderBy: { publishedAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.blogPost.count({ where: whereClause })
      ]);

      return {
        posts: posts as PostWithAuthor[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error: any) {
      const formattedError = formatPrismaError(error);
      throw new Error(`Failed to fetch posts: ${formattedError.message}`);
    }
  }

  /**
   * Get a single published post by slug
   */
  static async getPublishedPostBySlug(slug: string): Promise<PostWithAuthor | null> {
    try {
      return await prisma.blogPost.findFirst({
        where: {
          slug,
          published: true,
          publishedAt: {
            not: null
          }
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          }
        }
      }) as PostWithAuthor | null;
    } catch (error: any) {
      const formattedError = formatPrismaError(error);
      throw new Error(`Failed to fetch post: ${formattedError.message}`);
    }
  }

  /**
   * Get author's posts (including drafts)
   */
  static async getAuthorPosts(authorId: string, options: GetAuthorPostsOptions): Promise<PostsResponse> {
    const { page, limit, status = 'all' } = options;
    const skip = (page - 1) * limit;

    try {
      const whereClause: any = {
        authorId
      };

      if (status === 'published') {
        whereClause.published = true;
        whereClause.publishedAt = { not: null };
      } else if (status === 'draft') {
        whereClause.published = false;
      }
      // 'all' includes both published and draft

      const [posts, total] = await Promise.all([
        prisma.blogPost.findMany({
          where: whereClause,
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            tags: {
              include: {
                tag: true
              }
            }
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.blogPost.count({ where: whereClause })
      ]);

      return {
        posts: posts as PostWithAuthor[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error: any) {
      const formattedError = formatPrismaError(error);
      throw new Error(`Failed to fetch author posts: ${formattedError.message}`);
    }
  }

  /**
   * Get a single post by ID (for author/admin access)
   */
  static async getPostById(id: string): Promise<PostWithAuthor | null> {
    try {
      return await prisma.blogPost.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          }
        }
      }) as PostWithAuthor | null;
    } catch (error: any) {
      const formattedError = formatPrismaError(error);
      throw new Error(`Failed to fetch post: ${formattedError.message}`);
    }
  }

  /**
   * Create a new post
   */
  static async createPost(postData: CreatePostData): Promise<PostWithAuthor> {
    const {
      title,
      slug,
      content,
      excerpt,
      published = false,
      metaTitle,
      metaDescription,
      authorId,
      tags = []
    } = postData;

    try {
      // Check if slug already exists
      const existingPost = await prisma.blogPost.findUnique({
        where: { slug }
      });

      if (existingPost) {
        throw new Error(`A post with slug "${slug}" already exists`);
      }

      // Create post with tags
      const post = await prisma.blogPost.create({
        data: {
          title,
          slug,
          content,
          excerpt,
          published,
          publishedAt: published ? new Date() : null,
          metaTitle,
          metaDescription,
          authorId,
          tags: {
            create: tags.map(tagId => ({
              tag: {
                connect: { id: tagId }
              }
            }))
          }
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          }
        }
      });

      return post as PostWithAuthor;
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        throw error;
      }
      const formattedError = formatPrismaError(error);
      throw new Error(`Failed to create post: ${formattedError.message}`);
    }
  }

  /**
   * Update a post
   */
  static async updatePost(id: string, updateData: UpdatePostData): Promise<PostWithAuthor> {
    const { tags, ...postData } = updateData;

    try {
      // Check if slug is being updated and if it already exists
      if (postData.slug) {
        const existingPost = await prisma.blogPost.findFirst({
          where: {
            slug: postData.slug,
            NOT: { id }
          }
        });

        if (existingPost) {
          throw new Error(`A post with slug "${postData.slug}" already exists`);
        }
      }

      // Prepare update data with publishedAt handling
      const updateData: any = { ...postData };
      
      // If publishing the post, set publishedAt
      if (postData.published === true) {
        updateData.publishedAt = new Date();
      } else if (postData.published === false) {
        updateData.publishedAt = null;
      }

      const updateOperations: any = {
        data: updateData,
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          }
        }
      };

      // Handle tags update if provided
      if (tags !== undefined) {
        updateOperations.data.tags = {
          deleteMany: {},
          create: tags.map(tagId => ({
            tag: {
              connect: { id: tagId }
            }
          }))
        };
      }

      const updatedPost = await prisma.blogPost.update(updateOperations);

      return updatedPost as PostWithAuthor;
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        throw error;
      }
      const formattedError = formatPrismaError(error);
      if (formattedError.code === 'NOT_FOUND') {
        throw new Error('Post not found');
      }
      throw new Error(`Failed to update post: ${formattedError.message}`);
    }
  }

  /**
   * Update post status (publish/unpublish)
   */
  static async updatePostStatus(id: string, published: boolean): Promise<PostWithAuthor> {
    try {
      const updatedPost = await prisma.blogPost.update({
        where: { id },
        data: {
          published,
          publishedAt: published ? new Date() : null
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          }
        }
      });

      return updatedPost as PostWithAuthor;
    } catch (error: any) {
      const formattedError = formatPrismaError(error);
      if (formattedError.code === 'NOT_FOUND') {
        throw new Error('Post not found');
      }
      throw new Error(`Failed to update post status: ${formattedError.message}`);
    }
  }

  /**
   * Delete a post
   */
  static async deletePost(id: string): Promise<void> {
    try {
      await prisma.blogPost.delete({
        where: { id }
      });
    } catch (error: any) {
      const formattedError = formatPrismaError(error);
      if (formattedError.code === 'NOT_FOUND') {
        throw new Error('Post not found');
      }
      throw new Error(`Failed to delete post: ${formattedError.message}`);
    }
  }

  /**
   * Generate a unique slug from title
   */
  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Check if slug is available
   */
  static async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
    try {
      const whereClause: any = { slug };
      if (excludeId) {
        whereClause.NOT = { id: excludeId };
      }

      const existingPost = await prisma.blogPost.findFirst({
        where: whereClause
      });

      return !existingPost;
    } catch (error: any) {
      return false;
    }
  }
}