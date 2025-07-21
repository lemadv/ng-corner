import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { BlogPostsService } from '../data-access/blog-posts.service';
import { BlogPostsResponse } from '../models/api-response.interface';

export const blogPostsResolver: ResolveFn<BlogPostsResponse> = () => {
  const blogPostsService = inject(BlogPostsService);
  
  // Load initial posts for SSR/prerendering
  return blogPostsService.getPosts({ page: 1, limit: 10 });
};