import { inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { computed } from '@angular/core';
import { pipe, switchMap, tap, catchError, EMPTY, of } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { AppStore } from './app.store';

/**
 * User interface
 */
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified: boolean;
  provider: string;
  role: string;
}

/**
 * Authentication state interface
 */
export interface AuthState {
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

/**
 * Initial auth state
 */
export const initialAuthState: AuthState = {
  currentUser: null,
  isLoading: false,
  error: null,
  isInitialized: false,
};

/**
 * Authentication Feature Store
 * Manages all authentication-related state and operations
 */
export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialAuthState),
  withComputed((store) => ({
    isAuthenticated: computed(() => !!store.currentUser()),
    isAuthor: computed(() => {
      const user = store.currentUser();
      return user?.role === 'AUTHOR' || user?.role === 'ADMIN';
    }),
    isAdmin: computed(() => store.currentUser()?.role === 'ADMIN'),
    fullName: computed(() => {
      const user = store.currentUser();
      if (!user) return null;
      return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    }),
  })),
  withMethods((store) => {
    const http = inject(HttpClient);
    const appStore = inject(AppStore);
    const baseUrl = '/api/auth';
    const tokenKey = 'authToken';

    return {
      // Token management
      getStoredToken(): string | null {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem(tokenKey);
          // Check sessionStorage as backup
          if (!token) {
            const sessionToken = sessionStorage.getItem(tokenKey);
            if (sessionToken) {
              localStorage.setItem(tokenKey, sessionToken);
              return sessionToken;
            }
          }
          return token;
        }
        return null;
      },

      setStoredToken(token: string): void {
        if (typeof window !== 'undefined') {
          localStorage.setItem(tokenKey, token);
          sessionStorage.setItem(tokenKey, token);
        }
      },

      removeStoredToken(): void {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(tokenKey);
          sessionStorage.removeItem(tokenKey);
        }
      },

      // State updates
      setLoading(isLoading: boolean): void {
        patchState(store, { isLoading });
      },

      setError(error: string | null): void {
        patchState(store, { error });
      },

      setUser(user: User | null): void {
        patchState(store, { currentUser: user });
      },

      setInitialized(isInitialized: boolean): void {
        patchState(store, { isInitialized });
      },

      clearAuthData(): void {
        this.removeStoredToken();
        patchState(store, {
          currentUser: null,
          error: null,
          isInitialized: true,
        });
      },

      // Initialize authentication
      initializeAuth(): Promise<void> {
        return new Promise((resolve) => {
          if (typeof window === 'undefined') {
            this.setInitialized(true);
            resolve();
            return;
          }

          const token = this.getStoredToken();
          if (token) {
            // Restore user session from token
            http.get<{ user: User }>(`${baseUrl}/me`)
              .subscribe({
                next: (response) => {
                  this.setUser(response.user);
                  this.setInitialized(true);
                  resolve();
                },
                error: (error: HttpErrorResponse) => {
                  // Only clear auth data if it's a 401 (unauthorized) or 403 (forbidden)
                  if (error.status === 401 || error.status === 403) {
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('authToken');
                    }
                    patchState(store, {
                      currentUser: null,
                      isLoading: false,
                      error: null,
                    });
                  }
                  patchState(store, { isInitialized: true });
                  resolve();
                }
              });
          } else {
            this.setInitialized(true);
            resolve();
          }
        });
      },

      // Login method using rxMethod
      login: rxMethod<{ email: string; password: string; rememberMe?: boolean }>(
        pipe(
          tap(() => {
            patchState(store, { isLoading: true, error: null });
          }),
          switchMap((credentials) =>
            http.post<{
              message: string;
              user: User;
              accessToken: string;
              expiresIn: number;
            }>(`${baseUrl}/login`, credentials).pipe(
              tapResponse({
                next: (response) => {
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('authToken', response.accessToken);
                  }
                  patchState(store, {
                    currentUser: response.user,
                    isLoading: false,
                    error: null,
                  });
                },
                error: (error: HttpErrorResponse) => {
                  let errorMessage = 'An unexpected error occurred';
                  if (error.error?.message) {
                    errorMessage = error.error.message;
                  } else if (error.message) {
                    errorMessage = error.message;
                  }
                  patchState(store, {
                    isLoading: false,
                    error: errorMessage,
                  });
                },
              })
            )
          )
        )
      ),

      // Logout method using rxMethod
      logout: rxMethod<void>(
        pipe(
          switchMap(() =>
            http.post(`${baseUrl}/logout`, {}).pipe(
              tapResponse({
                next: () => {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('authToken');
                  }
                  patchState(store, {
                    currentUser: null,
                    isLoading: false,
                    error: null,
                  });
                },
                error: () => {
                  // Even if logout fails on server, clear local data
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('authToken');
                  }
                  patchState(store, {
                    currentUser: null,
                    isLoading: false,
                    error: null,
                  });
                },
              })
            )
          )
        )
      ),

      // Clear error
      clearError(): void {
        patchState(store, { error: null });
      },

      // Update user data
      updateUser(userData: Partial<User>): void {
        const currentUser = store.currentUser();
        if (currentUser) {
          patchState(store, {
            currentUser: { ...currentUser, ...userData },
          });
        }
      },

      // Role checks
      hasRole(requiredRole: string): boolean {
        const user = store.currentUser();
        if (!user) return false;
        // Admin has access to everything
        if (user.role === 'ADMIN') return true;
        return user.role === requiredRole;
      },

      hasAnyRole(requiredRoles: string[]): boolean {
        const user = store.currentUser();
        if (!user) return false;
        return requiredRoles.some(role => {
          if (user.role === 'ADMIN') return true;
          return user.role === role;
        });
      },

    };
  })
);

export type AuthStoreType = InstanceType<typeof AuthStore>;
