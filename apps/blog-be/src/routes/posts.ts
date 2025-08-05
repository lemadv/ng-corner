import express, { Request, Response } from 'express';
import { PostService } from '../services/post.service';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { 
  createPostSchema, 
  updatePostSchema, 
  getPostsSchema 
} from '../schemas/post.schemas';
import { logSecurityEvent } from '../middleware/security';

const router = express.Router();

/**
 * GET /posts
 * Get all published posts (public endpoint)
 */
router.get('/', validate(getPostsSchema), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search, tag } = req.query;
    
    const posts = await PostService.getPublishedPosts({
      page: Number(page),
      limit: Number(limit),
      search: search as string,
      tag: tag as string
    });

    res.json(posts);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      error: 'Failed to fetch posts',
      message: 'An error occurred while fetching posts'
    });
  }
});

/**
 * GET /posts/:slug
 * Get a single published post by slug (public endpoint)
 */
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const post = await PostService.getPublishedPostBySlug(slug);
    
    if (!post) {
      return res.status(404).json({
        error: 'Post not found',
        message: 'The requested post could not be found'
      });
    }

    res.json(post);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      error: 'Failed to fetch post',
      message: 'An error occurred while fetching the post'
    });
  }
});

/**
 * GET /posts/author/my-posts
 * Get author's own posts (author-only endpoint)
 */
router.get('/author/my-posts', authenticateToken, requireRole(['AUTHOR', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }

    const posts = await PostService.getAuthorPosts(req.user.id, {
      page: Number(page),
      limit: Number(limit),
      status: status as 'published' | 'draft' | 'all'
    });

    res.json(posts);
  } catch (error) {
    console.error('Get author posts error:', error);
    res.status(500).json({
      error: 'Failed to fetch posts',
      message: 'An error occurred while fetching your posts'
    });
  }
});

/**
 * POST /posts
 * Create a new post (author-only endpoint)
 */
router.post('/', authenticateToken, requireRole(['AUTHOR', 'ADMIN']), validate(createPostSchema), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }

    const postData = {
      ...req.body,
      authorId: req.user.id
    };

    const post = await PostService.createPost(postData);

    // Log security event
    logSecurityEvent('post_created', {
      userId: req.user.id,
      postId: post.id,
      title: post.title
    }, req);

    res.status(201).json({
      message: 'Post created successfully',
      post
    });
  } catch (error) {
    console.error('Create post error:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'Post creation failed',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Post creation failed',
      message: 'An error occurred while creating the post'
    });
  }
});

/**
 * PUT /posts/:id
 * Update a post (author can only update their own posts)
 */
router.put('/:id', authenticateToken, requireRole(['AUTHOR', 'ADMIN']), validate(updatePostSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }

    // Check if post exists and belongs to the user (unless admin)
    const existingPost = await PostService.getPostById(id);
    
    if (!existingPost) {
      return res.status(404).json({
        error: 'Post not found',
        message: 'The requested post could not be found'
      });
    }

    // Authors can only edit their own posts, admins can edit any post
    if (req.user.role !== 'ADMIN' && existingPost.authorId !== req.user.id) {
      logSecurityEvent('unauthorized_post_edit_attempt', {
        userId: req.user.id,
        postId: id,
        postAuthorId: existingPost.authorId
      }, req);

      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only edit your own posts'
      });
    }

    const updatedPost = await PostService.updatePost(id, req.body);

    // Log security event
    logSecurityEvent('post_updated', {
      userId: req.user.id,
      postId: id,
      title: updatedPost.title
    }, req);

    res.json({
      message: 'Post updated successfully',
      post: updatedPost
    });
  } catch (error) {
    console.error('Update post error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Post not found',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Post update failed',
      message: 'An error occurred while updating the post'
    });
  }
});

/**
 * PATCH /posts/:id/publish
 * Publish/unpublish a post (author can only manage their own posts)
 */
router.patch('/:id/publish', authenticateToken, requireRole(['AUTHOR', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { published } = req.body;
    
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }

    if (typeof published !== 'boolean') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Published status must be a boolean value'
      });
    }

    // Check if post exists and belongs to the user (unless admin)
    const existingPost = await PostService.getPostById(id);
    
    if (!existingPost) {
      return res.status(404).json({
        error: 'Post not found',
        message: 'The requested post could not be found'
      });
    }

    // Authors can only manage their own posts, admins can manage any post
    if (req.user.role !== 'ADMIN' && existingPost.authorId !== req.user.id) {
      logSecurityEvent('unauthorized_post_publish_attempt', {
        userId: req.user.id,
        postId: id,
        postAuthorId: existingPost.authorId
      }, req);

      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only manage your own posts'
      });
    }

    const updatedPost = await PostService.updatePostStatus(id, published);

    // Log security event
    logSecurityEvent(published ? 'post_published' : 'post_unpublished', {
      userId: req.user.id,
      postId: id,
      title: updatedPost.title
    }, req);

    res.json({
      message: `Post ${published ? 'published' : 'unpublished'} successfully`,
      post: updatedPost
    });
  } catch (error) {
    console.error('Publish post error:', error);
    res.status(500).json({
      error: 'Post status update failed',
      message: 'An error occurred while updating the post status'
    });
  }
});

/**
 * DELETE /posts/:id
 * Delete a post (author can only delete their own posts)
 */
router.delete('/:id', authenticateToken, requireRole(['AUTHOR', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }

    // Check if post exists and belongs to the user (unless admin)
    const existingPost = await PostService.getPostById(id);
    
    if (!existingPost) {
      return res.status(404).json({
        error: 'Post not found',
        message: 'The requested post could not be found'
      });
    }

    // Authors can only delete their own posts, admins can delete any post
    if (req.user.role !== 'ADMIN' && existingPost.authorId !== req.user.id) {
      logSecurityEvent('unauthorized_post_delete_attempt', {
        userId: req.user.id,
        postId: id,
        postAuthorId: existingPost.authorId
      }, req);

      return res.status(403).json({
        error: 'Access denied',
        message: 'You can only delete your own posts'
      });
    }

    await PostService.deletePost(id);

    // Log security event
    logSecurityEvent('post_deleted', {
      userId: req.user.id,
      postId: id,
      title: existingPost.title
    }, req);

    res.json({
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      error: 'Post deletion failed',
      message: 'An error occurred while deleting the post'
    });
  }
});

export default router;