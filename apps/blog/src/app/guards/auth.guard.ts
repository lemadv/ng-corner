import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { AuthStore } from '../store/auth.store';

export const authGuard: CanActivateFn = (route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  if (authStore.isAuthenticated()) {
    // Check if user has author role for author routes
    if (state.url.startsWith('/author') && !authStore.isAuthor()) {
      // Redirect non-authors to home page
      router.navigate(['/']);
      return false;
    }
    return true;
  } else {
    // Redirect to login page with return URL
    router.navigate(['/login'], { 
      queryParams: { returnUrl: state.url } 
    });
    return false;
  }
};