import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../store/auth.store';

@Component({
  selector: 'app-navbar',
  imports: [RouterModule, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavbarComponent {
  readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  readonly isUserMenuOpen = signal(false);


  toggleUserMenu(): void {
    this.isUserMenuOpen.set(!this.isUserMenuOpen());
  }

  closeUserMenu(): void {
    this.isUserMenuOpen.set(false);
  }

  logout(): void {
    this.authStore.logout();
    this.closeUserMenu();
    this.router.navigate(['/']);
  }
}