import { Injectable, inject } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthStore } from '../store/auth.store';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Add auth token to request if available
    const authRequest = this.addTokenToRequest(request);
    
    return next.handle(authRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 errors by attempting token refresh
        if (error.status === 401 && this.authStore.isAuthenticated()) {
          return this.handle401Error(authRequest, next);
        }
        
        // Handle 403 errors by redirecting to home
        if (error.status === 403) {
          this.router.navigate(['/']);
        }
        
        return throwError(() => error);
      })
    );
  }

  private addTokenToRequest(request: HttpRequest<unknown>): HttpRequest<unknown> {
    const token = this.authStore.getStoredToken();
    
    if (token && this.shouldAddToken(request.url)) {
      return request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    return request;
  }

  private shouldAddToken(url: string): boolean {
    // Add token to API requests but not to external URLs
    return url.startsWith('/api/') || url.startsWith('http://localhost') || url.startsWith('https://localhost');
  }

  private handle401Error(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // For now, just clear auth data and redirect to login
    // Token refresh can be implemented later if needed
    this.authStore.clearAuthData();
    this.router.navigate(['/login']);
    return throwError(() => new Error('Authentication failed'));
  }
}