import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterModule, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly isUserMenuOpen = signal(false);

  toggleUserMenu(): void {
    this.isUserMenuOpen.set(!this.isUserMenuOpen());
  }

  closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        console.log('Logged out successfully');
        this.closeUserMenu();
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error('Logout failed:', error);
        // Even if logout fails, navigate home
        this.closeUserMenu();
        this.router.navigate(['/']);
      }
    });
  }
}