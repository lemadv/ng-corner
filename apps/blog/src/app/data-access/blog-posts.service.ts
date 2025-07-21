import { Injectable, inject, TransferState, makeStateKey } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { BlogPost } from '../models/blog-post.interface';
import { BlogPostsResponse, BlogPostSearchParams } from '../models/api-response.interface';

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

    return this.http.get<BlogPostsResponse>(this.apiUrl, { params: httpParams }).pipe(
      tap(response => {
        // Store response in transfer state for potential future use
        this.transferState.set(stateKey, response);
      })
    );
  }

  getPost(id: string): Observable<BlogPost> {
    return this.http.get<BlogPost>(`${this.apiUrl}/${id}`);
  }
}