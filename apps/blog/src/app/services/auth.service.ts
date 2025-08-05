import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  provider: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  message: string;
  user: User;
  accessToken: string;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
  nextStep: string;
}

export interface AuthError {
  error: string;
  message: string;
  action?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  
  private readonly baseUrl = '/api/auth';
  private readonly tokenKey = 'access_token';
  
  // Signals for reactive state management
  private readonly _currentUser = signal<User | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);
  
  // Public readonly signals
  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  
  // Computed signals
  readonly isAuthenticated = computed(() => !!this._currentUser());
  readonly isAuthor = computed(() => {
    const user = this._currentUser();
    return user?.role === 'AUTHOR' || user?.role === 'ADMIN';
  });
  readonly isAdmin = computed(() => this._currentUser()?.role === 'ADMIN');
  
  constructor() {
    this.initializeAuth();
  }
  
  /**
   * Initialize authentication state from stored token
   */
  private initializeAuth(): void {
    const token = this.getStoredToken();
    if (token) {
      this.getCurrentUser().subscribe({
        next: (user) => {
          this._currentUser.set(user);
        },
        error: () => {
          this.clearAuthData();
        }
      });
    }
  }
  
  /**
   * Login with email and password
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    this._isLoading.set(true);
    this._error.set(null);
    
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap(response => {
        this.setAuthData(response.accessToken, response.user);
        this._currentUser.set(response.user);
      }),
      catchError(this.handleError.bind(this)),
      tap(() => this._isLoading.set(false))
    );
  }
  
  /**
   * Register a new user account
   */
  register(userData: RegisterRequest): Observable<RegisterResponse> {
    this._isLoading.set(true);
    this._error.set(null);
    
    return this.http.post<RegisterResponse>(`${this.baseUrl}/register`, userData).pipe(
      catchError(this.handleError.bind(this)),
      tap(() => this._isLoading.set(false))
    );
  }
  
  /**
   * Logout the current user
   */
  logout(): Observable<any> {
    return this.http.post(`${this.baseUrl}/logout`, {}).pipe(
      tap(() => {
        this.clearAuthData();
        this.router.navigate(['/']);
      }),
      catchError(() => {
        // Even if logout fails on server, clear local data
        this.clearAuthData();
        this.router.navigate(['/']);
        return throwError(() => new Error('Logout failed'));
      })
    );
  }
  
  /**
   * Get current user profile
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<{ user: User }>(`${this.baseUrl}/me`).pipe(
      map(response => response.user)
    );
  }
  
  /**
   * Refresh the access token
   */
  refreshToken(): Observable<{ accessToken: string; expiresIn: number }> {
    return this.http.post<{ accessToken: string; expiresIn: number }>(
      `${this.baseUrl}/refresh`, 
      {}
    ).pipe(
      tap(response => {
        this.setStoredToken(response.accessToken);
      })
    );
  }
  
  /**
   * Verify email with token
   */
  verifyEmail(token: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/verify-email`, { token });
  }
  
  /**
   * Resend email verification
   */
  resendVerification(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/resend-verification`, { email });
  }
  
  /**
   * Get stored access token
   */
  getStoredToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }
  
  /**
   * Set stored access token
   */
  private setStoredToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.tokenKey, token);
    }
  }
  
  /**
   * Remove stored access token
   */
  private removeStoredToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.tokenKey);
    }
  }
  
  /**
   * Set authentication data
   */
  private setAuthData(token: string, user: User): void {
    this.setStoredToken(token);
    this._currentUser.set(user);
  }
  
  /**
   * Clear all authentication data
   */
  private clearAuthData(): void {
    this.removeStoredToken();
    this._currentUser.set(null);
    this._error.set(null);
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
    
    this._error.set(errorMessage);
    this._isLoading.set(false);
    
    return throwError(() => error);
  }
  
  /**
   * Clear error state
   */
  clearError(): void {
    this._error.set(null);
  }
  
  /**
   * Check if user has required role
   */
  hasRole(requiredRole: string): boolean {
    const user = this._currentUser();
    if (!user) return false;
    
    // Admin has access to everything
    if (user.role === 'ADMIN') return true;
    
    return user.role === requiredRole;
  }
  
  /**
   * Check if user has any of the required roles
   */
  hasAnyRole(requiredRoles: string[]): boolean {
    return requiredRoles.some(role => this.hasRole(role));
  }
  
  /**
   * Update user data in current state
   */
  updateUser(userData: Partial<User>): void {
    const currentUser = this._currentUser();
    if (currentUser) {
      this._currentUser.set({ ...currentUser, ...userData });
    }
  }
}