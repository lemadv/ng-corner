import { Component, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService, LoginRequest } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Author Login</mat-card-title>
          <mat-card-subtitle>Sign in to manage your blog posts</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          @if (authService.error()) {
            <div class="error-message">
              <mat-icon>error</mat-icon>
              {{ authService.error() }}
            </div>
          }
          
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit($event)">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input 
                matInput 
                type="email" 
                formControlName="email" 
                required
                autocomplete="email"
              >
              <mat-icon matSuffix>email</mat-icon>
              @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
                <mat-error>
                  @if (loginForm.get('email')?.errors?.['required']) {
                    Email is required
                  } @else if (loginForm.get('email')?.errors?.['email']) {
                    Please enter a valid email address
                  }
                </mat-error>
              }
            </mat-form-field>
            
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input 
                matInput 
                [type]="hidePassword() ? 'password' : 'text'" 
                formControlName="password" 
                required
                autocomplete="current-password"
              >
              <button 
                mat-icon-button 
                matSuffix 
                type="button"
                (click)="hidePassword.set(!hidePassword())"
              >
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
                <mat-error>
                  @if (loginForm.get('password')?.errors?.['required']) {
                    Password is required
                  } @else if (loginForm.get('password')?.errors?.['minlength']) {
                    Password must be at least 8 characters long
                  }
                </mat-error>
              }
            </mat-form-field>
            
            <div class="form-options">
              <mat-checkbox formControlName="rememberMe">
                Remember me
              </mat-checkbox>
            </div>
            
            <div class="form-actions">
              <button 
                mat-raised-button 
                color="primary" 
                type="submit" 
                [disabled]="loginForm.invalid || authService.isLoading()"
                class="login-button"
              >
                @if (authService.isLoading()) {
                  <mat-spinner diameter="20"></mat-spinner>
                  Signing in...
                } @else {
                  Sign In
                }
              </button>
            </div>
          </form>
        </mat-card-content>
        
        <mat-card-actions>
          <div class="card-footer">
            <p>Don't have an author account? Contact the administrator.</p>
          </div>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styleUrl: './login.component.scss',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatIconModule
  ]
})
export class LoginComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  
  readonly hidePassword = signal(true);
  
  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    rememberMe: [false]
  });
  
  onSubmit(event?: Event): void {
    event?.preventDefault();
    
    if (this.loginForm.valid) {
      this.authService.clearError();
      
      const credentials: LoginRequest = {
        email: this.loginForm.value.email!,
        password: this.loginForm.value.password!,
        rememberMe: this.loginForm.value.rememberMe || false
      };
      
      this.authService.login(credentials).subscribe({
        next: (response) => {
          console.log('Login successful:', response);
          
          // Get return URL from query params or default to appropriate page
          const returnUrl = this.route.snapshot.queryParams['returnUrl'];
          
          if (returnUrl) {
            this.router.navigateByUrl(returnUrl);
          } else if (this.authService.isAuthor()) {
            this.router.navigate(['/author/dashboard']);
          } else {
            this.router.navigate(['/']);
          }
        },
        error: (error) => {
          console.error('Login failed:', error);
          // Error is handled by the service and displayed in template
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      this.loginForm.markAllAsTouched();
    }
  }
}