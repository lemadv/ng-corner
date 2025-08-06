import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  template: `
    <div class="skeleton-card">
      <div class="skeleton-header">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-meta"></div>
      </div>
      <div class="skeleton-content">
        <div class="skeleton-line skeleton-text"></div>
        <div class="skeleton-line skeleton-text"></div>
        <div class="skeleton-line skeleton-text short"></div>
      </div>
      <div class="skeleton-tags">
        <div class="skeleton-tag"></div>
        <div class="skeleton-tag"></div>
      </div>
      <div class="skeleton-actions">
        <div class="skeleton-button"></div>
      </div>
    </div>
  `,
  styles: [`
    .skeleton-card {
      background-color: var(--bg-surface);
      border: 1px solid var(--border-primary);
      border-radius: var(--radius-xl);
      padding: var(--space-xl);
      box-shadow: var(--shadow-sm);
      animation: pulse 1.5s ease-in-out infinite alternate;
      
      // Ensure consistent height to prevent layout shifts
      min-height: 350px;
      height: 350px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .skeleton-header {
      margin-bottom: var(--space-lg);
    }

    .skeleton-line {
      background: linear-gradient(
        90deg,
        var(--bg-secondary) 25%,
        var(--bg-tertiary) 50%,
        var(--bg-secondary) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius-sm);
      margin-bottom: var(--space-sm);
    }

    .skeleton-title {
      height: 24px;
      width: 80%;
    }

    .skeleton-meta {
      height: 16px;
      width: 60%;
    }

    .skeleton-text {
      height: 16px;
      width: 100%;
      
      &.short {
        width: 70%;
      }
    }

    .skeleton-content {
      margin-bottom: var(--space-lg);
    }

    .skeleton-tags {
      display: flex;
      gap: var(--space-sm);
      margin-bottom: var(--space-lg);
    }

    .skeleton-tag {
      height: 24px;
      width: 60px;
      background: linear-gradient(
        90deg,
        var(--bg-secondary) 25%,
        var(--bg-tertiary) 50%,
        var(--bg-secondary) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius-full);
    }

    .skeleton-button {
      height: 40px;
      width: 120px;
      background: linear-gradient(
        90deg,
        var(--bg-secondary) 25%,
        var(--bg-tertiary) 50%,
        var(--bg-secondary) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--radius-lg);
    }

    @keyframes shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }

    @keyframes pulse {
      0% {
        opacity: 1;
      }
      100% {
        opacity: 0.8;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkeletonComponent {}