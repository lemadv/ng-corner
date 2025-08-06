import {
  ApplicationConfig,
  provideZoneChangeDetection,
  APP_INITIALIZER,
  inject,
} from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideMarkdown } from 'ngx-markdown';
import { appRoutes } from './app.routes';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { AuthService } from './services/auth.service';

/**
 * Factory function for APP_INITIALIZER to initialize authentication
 */
function initializeAuthFactory(): () => Promise<void> {
  return () => {
    const authService = inject(AuthService);
    return authService.initializeAuth();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true, runCoalescing: true }),
    provideRouter(appRoutes, withPreloading(PreloadAllModules)),
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    provideAnimations(),
    provideMarkdown(),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuthFactory,
      multi: true
    }
  ],
};
