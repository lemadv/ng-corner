import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BlogPost } from '../models/blog-post.interface';
import { BlogPostsResponse, BlogPostSearchParams } from '../models/api-response.interface';

@Injectable({
  providedIn: 'root'
})
export class BlogPostsService {
  private http = inject(HttpClient);
  private readonly apiUrl = '/api/posts';

  getPosts(params: BlogPostSearchParams = {}): Observable<BlogPostsResponse> {
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

    return this.http.get<BlogPostsResponse>(this.apiUrl, { params: httpParams });
  }

  getPost(id: string): Observable<BlogPost> {
    return this.http.get<BlogPost>(`${this.apiUrl}/${id}`);
  }
}