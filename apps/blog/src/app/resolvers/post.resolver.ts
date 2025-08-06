import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BlogPost } from '../models/blog-post.interface';
import { BlogPostsService } from '../data-access/blog-posts.service';

/**
 * Resolver for individual blog posts
 * Pre-loads post data for SSR and client-side hydration
 */
export const postResolver: ResolveFn<BlogPost | null> = (route): Observable<BlogPost | null> => {
  const blogPostsService = inject(BlogPostsService);
  const slug = route.paramMap.get('slug');

  if (!slug) {
    console.warn('No slug provided to post resolver');
    return of(null);
  }

  return blogPostsService.getPost(slug).pipe(
    catchError((error) => {
      console.error('Error loading post in resolver:', error);
      // Return null instead of throwing to allow the component to handle the error
      return of(null);
    })
  );
};