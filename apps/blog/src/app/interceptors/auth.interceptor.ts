import { Injectable, inject } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Add auth token to request if available
    const authRequest = this.addTokenToRequest(request);
    
    return next.handle(authRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 errors by attempting token refresh
        if (error.status === 401 && this.authService.isAuthenticated()) {
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
    const token = this.authService.getStoredToken();
    
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
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((tokens: any) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(tokens.accessToken);
          
          // Retry the original request with new token
          const authRequest = this.addTokenToRequest(request);
          return next.handle(authRequest);
        }),
        catchError((error) => {
          this.isRefreshing = false;
          
          // Refresh failed, redirect to login
          this.authService.logout().subscribe();
          this.router.navigate(['/login']);
          
          return throwError(() => error);
        })
      );
    } else {
      // Wait for refresh to complete
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(() => {
          const authRequest = this.addTokenToRequest(request);
          return next.handle(authRequest);
        })
      );
    }
  }
}