import { Component, signal, inject, effect, Injector } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthStore } from '../../store/auth.store';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1 class="login-title">Author Login</h1>
          <p class="login-subtitle">Sign in to manage your blog posts</p>
        </div>

        <div class="login-content">
          @if (authStore.error()) {
          <div class="error-message">
            <svg class="error-icon" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
              />
            </svg>
            {{ authStore.error() }}
          </div>
          }

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit($event)">
            <div class="form-field">
              <label for="email" class="form-label">Email</label>
              <div class="input-wrapper">
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  required
                  autocomplete="email"
                  class="form-input"
                  [class.error]="
                    loginForm.get('email')?.invalid &&
                    loginForm.get('email')?.touched
                  "
                />
                <svg class="input-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"
                  />
                </svg>
              </div>
              @if (loginForm.get('email')?.invalid &&
              loginForm.get('email')?.touched) {
              <div class="form-error">
                @if (loginForm.get('email')?.errors?.['required']) { Email is
                required } @else if (loginForm.get('email')?.errors?.['email'])
                { Please enter a valid email address }
              </div>
              }
            </div>

            <div class="form-field">
              <label for="password" class="form-label">Password</label>
              <div class="input-wrapper">
                <input
                  id="password"
                  [type]="hidePassword() ? 'password' : 'text'"
                  formControlName="password"
                  required
                  autocomplete="current-password"
                  class="form-input"
                  [class.error]="
                    loginForm.get('password')?.invalid &&
                    loginForm.get('password')?.touched
                  "
                />
                <button
                  type="button"
                  class="password-toggle"
                  (click)="hidePassword.set(!hidePassword())"
                >
                  @if (hidePassword()) {
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
                    />
                  </svg>
                  } @else {
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path
                      d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                    />
                  </svg>
                  }
                </button>
              </div>
              @if (loginForm.get('password')?.invalid &&
              loginForm.get('password')?.touched) {
              <div class="form-error">
                @if (loginForm.get('password')?.errors?.['required']) { Password
                is required } @else if
                (loginForm.get('password')?.errors?.['minlength']) { Password
                must be at least 8 characters long }
              </div>
              }
            </div>

            <div class="form-options">
              <label class="checkbox-wrapper">
                <input
                  type="checkbox"
                  formControlName="rememberMe"
                  class="checkbox-input"
                />
                <span class="checkbox-custom"></span>
                <span class="checkbox-label">Remember me</span>
              </label>
            </div>

            <div class="form-actions">
              <button
                type="submit"
                [disabled]="loginForm.invalid || authStore.isLoading()"
                class="login-button"
              >
                @if (authStore.isLoading()) {
                <div class="spinner"></div>
                Signing in... } @else { Sign In }
              </button>
            </div>
          </form>
        </div>

        <div class="login-footer">
          <p>Don't have an author account? Contact the administrator.</p>
        </div>
      </div>
    </div>
  `,
  styleUrl: './login.component.scss',
  imports: [CommonModule, ReactiveFormsModule],
})
export class LoginComponent {
  readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly injector = inject(Injector);

  readonly hidePassword = signal(true);

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false],
  });

  onSubmit(event?: Event): void {
    event?.preventDefault();

    if (this.loginForm.valid) {
      this.authStore.clearError();

      const credentials = {
        email: this.loginForm.value.email!,
        password: this.loginForm.value.password!,
        rememberMe: this.loginForm.value.rememberMe || false,
      };

      // Call the login method and handle navigation after state changes
      this.authStore.login(credentials);

      // Set up effect to watch for successful authentication
      const navigationEffect = effect(
        () => {
          const isLoading = this.authStore.isLoading();
          const isAuthenticated = this.authStore.isAuthenticated();

          if (!isLoading && isAuthenticated) {
            // Login successful, navigate
            const returnUrl = this.route.snapshot.queryParams['returnUrl'];

            if (returnUrl) {
              this.router.navigateByUrl(returnUrl);
            } else if (this.authStore.isAuthor()) {
              this.router.navigate(['/author/dashboard']);
            } else {
              this.router.navigate(['/']);
            }

            // Clean up effect after navigation
            navigationEffect.destroy();
          }
        },
        { injector: this.injector }
      );

      // Store reference to effect for potential cleanup
      (this as any).navigationEffect = navigationEffect;
    } else {
      // Mark all fields as touched to show validation errors
      this.loginForm.markAllAsTouched();
    }
  }
}
