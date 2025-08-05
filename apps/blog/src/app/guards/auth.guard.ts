import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    // Check if user has author role for author routes
    if (state.url.startsWith('/author') && !authService.isAuthor()) {
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