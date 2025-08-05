import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface User {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface TagRelation {
  tag: Tag;
}

export interface PostWithAuthor {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  published: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  metaTitle?: string;
  metaDescription?: string;
  authorId: string;
  author: User;
  tags: TagRelation[];
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

export interface CreatePostRequest {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  published?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
}

export interface UpdatePostRequest {
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
  page?: number;
  limit?: number;
  search?: string;
  tag?: string;
}

export interface GetAuthorPostsOptions {
  page?: number;
  limit?: number;
  status?: 'published' | 'draft' | 'all';
}

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/posts';

  /**
   * Get all published posts (public endpoint)
   */
  getPublishedPosts(options: GetPostsOptions = {}): Observable<PostsResponse> {
    let params = new HttpParams();
    
    if (options.page) params = params.set('page', options.page.toString());
    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.search) params = params.set('search', options.search);
    if (options.tag) params = params.set('tag', options.tag);

    return this.http.get<PostsResponse>(`${this.baseUrl}`, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get a single published post by slug
   */
  getPublishedPostBySlug(slug: string): Observable<PostWithAuthor> {
    return this.http.get<{ post: PostWithAuthor }>(`${this.baseUrl}/${slug}`)
      .pipe(
        map(response => response.post),
        catchError(this.handleError)
      );
  }

  /**
   * Get author's posts (including drafts) - requires authentication
   */
  getAuthorPosts(options: GetAuthorPostsOptions = {}): Observable<PostsResponse> {
    let params = new HttpParams();
    
    if (options.page) params = params.set('page', options.page.toString());
    if (options.limit) params = params.set('limit', options.limit.toString());
    if (options.status) params = params.set('status', options.status);

    return this.http.get<PostsResponse>(`${this.baseUrl}/author/my-posts`, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get a single post by ID (for author/admin access) - requires authentication
   */
  getPostById(id: string): Observable<PostWithAuthor> {
    return this.http.get<{ post: PostWithAuthor }>(`${this.baseUrl}/author/${id}`)
      .pipe(
        map(response => response.post),
        catchError(this.handleError)
      );
  }

  /**
   * Create a new post - requires author authentication
   */
  createPost(postData: CreatePostRequest): Observable<PostWithAuthor> {
    return this.http.post<{ post: PostWithAuthor; message: string }>(`${this.baseUrl}/author`, postData)
      .pipe(
        map(response => response.post),
        catchError(this.handleError)
      );
  }

  /**
   * Update a post - requires author authentication
   */
  updatePost(id: string, updateData: UpdatePostRequest): Observable<PostWithAuthor> {
    return this.http.put<{ post: PostWithAuthor; message: string }>(`${this.baseUrl}/author/${id}`, updateData)
      .pipe(
        map(response => response.post),
        catchError(this.handleError)
      );
  }

  /**
   * Update post status (publish/unpublish) - requires author authentication
   */
  updatePostStatus(id: string, published: boolean): Observable<PostWithAuthor> {
    return this.http.patch<{ post: PostWithAuthor; message: string }>(`${this.baseUrl}/author/${id}/status`, { published })
      .pipe(
        map(response => response.post),
        catchError(this.handleError)
      );
  }

  /**
   * Delete a post - requires author authentication
   */
  deletePost(id: string): Observable<void> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/author/${id}`)
      .pipe(
        map(() => void 0),
        catchError(this.handleError)
      );
  }

  /**
   * Generate a slug from title
   */
  generateSlug(title: string): string {
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
  checkSlugAvailability(slug: string, excludeId?: string): Observable<{ available: boolean }> {
    let params = new HttpParams().set('slug', slug);
    if (excludeId) {
      params = params.set('excludeId', excludeId);
    }

    return this.http.get<{ available: boolean }>(`${this.baseUrl}/author/check-slug`, { params })
      .pipe(catchError(this.handleError));
  }

  /**
   * Get available tags
   */
  getTags(): Observable<Tag[]> {
    return this.http.get<{ tags: Tag[] }>(`${this.baseUrl}/tags`)
      .pipe(
        map(response => response.tags),
        catchError(this.handleError)
      );
  }

  /**
   * Create a new tag
   */
  createTag(name: string): Observable<Tag> {
    return this.http.post<{ tag: Tag; message: string }>(`${this.baseUrl}/tags`, { name })
      .pipe(
        map(response => response.tag),
        catchError(this.handleError)
      );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred';
    
    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    console.error('PostService error:', error);
    return throwError(() => new Error(errorMessage));
  }
}