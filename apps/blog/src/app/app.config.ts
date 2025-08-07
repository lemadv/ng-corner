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
import { AuthStore } from './store/auth.store';

// Import Prism.js for syntax highlighting
import 'prismjs';
import 'prismjs/plugins/line-numbers/prism-line-numbers';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

/**
 * Factory function for APP_INITIALIZER to initialize authentication
 */
function initializeAuthFactory(): () => Promise<void> {
  return () => {
    const authStore = inject(AuthStore);
    return authStore.initializeAuth();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
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
