import { Injectable, inject, TransferState, makeStateKey } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { BlogPost } from '../models/blog-post.interface';
import { BlogPostsResponse, BlogPostSearchParams } from '../models/api-response.interface';
import { PostWithAuthor, PostsResponse } from '../store/post.store';

@Injectable({
  providedIn: 'root'
})
export class BlogPostsService {
  private http = inject(HttpClient);
  private transferState = inject(TransferState);
  private readonly apiUrl = '/api/posts';

  getPosts(params: BlogPostSearchParams = {}): Observable<BlogPostsResponse> {
    // Create a unique key for this specific request
    const stateKey = makeStateKey<BlogPostsResponse>(`posts-${JSON.stringify(params)}`);
    
    // Check if data exists in transfer state (from SSR)
    const transferredData = this.transferState.get(stateKey, null);
    if (transferredData) {
      // Remove from transfer state to prevent memory leaks
      this.transferState.remove(stateKey);
      return of(transferredData);
    }

    // Make HTTP request if no transferred data
    let httpParams = new HttpParams();
    
    if (params.page) {
      httpParams = httpParams.set('page', params.page.toString());
    }
    if (params.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params.search) {
      httpParams = httpParams.set('search', params.search);
    }
    if (params.tag) {
      httpParams = httpParams.set('tag', params.tag);
    }

    return this.http.get<PostsResponse>(this.apiUrl, { params: httpParams }).pipe(
      map(response => this.transformPostsResponse(response)),
      tap(response => {
        // Store response in transfer state for potential future use
        this.transferState.set(stateKey, response);
      })
    );
  }

  private transformPostsResponse(response: PostsResponse): BlogPostsResponse {
    return {
      posts: response.posts.map(post => this.transformPost(post)),
      pagination: {
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
        hasMore: response.pagination.page < response.pagination.totalPages
      }
    };
  }

  private transformPost(post: PostWithAuthor): BlogPost {
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      author: post.author.firstName && post.author.lastName 
        ? `${post.author.firstName} ${post.author.lastName}` 
        : post.author.email,
      createdDate: post.createdAt,
      modifiedDate: post.updatedAt,
      content: post.content || '',
      excerpt: post.excerpt || undefined,
      tags: post.tags?.map(tag => tag.tag.name) || [],
      published: post.published,
      metaTitle: post.metaTitle || undefined,
      metaDescription: post.metaDescription || undefined
    };
  }

  getPost(idOrSlug: string): Observable<BlogPost> {
    // Create a unique key for this specific post
    const stateKey = makeStateKey<BlogPost>(`post-${idOrSlug}`);
    
    // Check if data exists in transfer state (from SSR)
    const transferredData = this.transferState.get(stateKey, null);
    if (transferredData) {
      // Remove from transfer state to prevent memory leaks
      this.transferState.remove(stateKey);
      return of(transferredData);
    }

    // Make HTTP request if no transferred data
    return this.http.get<PostWithAuthor>(`${this.apiUrl}/${idOrSlug}`).pipe(
      map(post => this.transformPost(post)),
      tap(transformedPost => {
        // Store response in transfer state for potential future use
        this.transferState.set(stateKey, transformedPost);
      })
    );
  }
}