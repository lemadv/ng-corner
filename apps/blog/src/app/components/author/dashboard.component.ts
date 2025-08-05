import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { PostService, PostWithAuthor } from '../../services/post.service';

@Component({
  selector: 'app-author-dashboard',
  template: `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h1>Author Dashboard</h1>
        <p class="welcome-message">
          Welcome back, {{ authService.currentUser()?.firstName || 'Author' }}! 
          Manage your blog posts and create new content.
        </p>
      </div>

      <mat-tab-group class="dashboard-tabs" (selectedTabChange)="onTabChange($event)">
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>article</mat-icon>
            My Posts
            @if (totalPosts() > 0) {
              <mat-chip-set>
                <mat-chip>{{ totalPosts() }}</mat-chip>
              </mat-chip-set>
            }
          </ng-template>
          
          <div class="tab-content">
            <div class="tab-header">
              <h2>My Posts</h2>
              <div class="tab-actions">
                <button mat-raised-button color="primary" (click)="createNewPost()">
                  <mat-icon>add</mat-icon>
                  New Post
                </button>
              </div>
            </div>

            @if (isLoading()) {
              <div class="loading-container">
                <mat-spinner></mat-spinner>
                <p>Loading your posts...</p>
              </div>
            } @else if (posts().length === 0) {
              <div class="empty-state">
                <mat-icon>article</mat-icon>
                <h3>No posts yet</h3>
                <p>Create your first blog post to get started!</p>
                <button mat-raised-button color="primary" (click)="createNewPost()">
                  <mat-icon>add</mat-icon>
                  Create First Post
                </button>
              </div>
            } @else {
              <div class="posts-grid">
                @for (post of posts(); track post.id) {
                  <mat-card class="post-card">
                    <mat-card-header>
                      <mat-card-title>{{ post.title }}</mat-card-title>
                      <mat-card-subtitle>
                        <div class="post-meta">
                          <span class="post-status" [class]="post.published ? 'published' : 'draft'">
                            <mat-icon>{{ post.published ? 'visibility' : 'visibility_off' }}</mat-icon>
                            {{ post.published ? 'Published' : 'Draft' }}
                          </span>
                          <span class="post-date">
                            {{ post.published ? 
                              (post.publishedAt | date:'MMM d, y') : 
                              (post.updatedAt | date:'MMM d, y') 
                            }}
                          </span>
                        </div>
                      </mat-card-subtitle>
                    </mat-card-header>
                    
                    <mat-card-content>
                      @if (post.excerpt) {
                        <p class="post-excerpt">{{ post.excerpt }}</p>
                      }
                      
                      @if (post.tags && post.tags.length > 0) {
                        <div class="post-tags">
                          @for (tagRelation of post.tags; track tagRelation.tag.id) {
                            <mat-chip>{{ tagRelation.tag.name }}</mat-chip>
                          }
                        </div>
                      }
                    </mat-card-content>
                    
                    <mat-card-actions>
                      <button mat-button (click)="editPost(post.id)">
                        <mat-icon>edit</mat-icon>
                        Edit
                      </button>
                      
                      @if (post.published) {
                        <button mat-button (click)="viewPost(post.slug)">
                          <mat-icon>visibility</mat-icon>
                          View
                        </button>
                        <button mat-button (click)="togglePostStatus(post.id, false)">
                          <mat-icon>visibility_off</mat-icon>
                          Unpublish
                        </button>
                      } @else {
                        <button mat-button color="primary" (click)="togglePostStatus(post.id, true)">
                          <mat-icon>publish</mat-icon>
                          Publish
                        </button>
                      }
                      
                      <button mat-icon-button [matMenuTriggerFor]="postMenu">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      
                      <mat-menu #postMenu="matMenu">
                        <button mat-menu-item (click)="duplicatePost(post.id)">
                          <mat-icon>content_copy</mat-icon>
                          Duplicate
                        </button>
                        <button mat-menu-item (click)="deletePost(post.id)" class="danger">
                          <mat-icon>delete</mat-icon>
                          Delete
                        </button>
                      </mat-menu>
                    </mat-card-actions>
                  </mat-card>
                }
              </div>
            }
          </div>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>analytics</mat-icon>
            Analytics
          </ng-template>
          
          <div class="tab-content">
            <div class="analytics-cards">
              <mat-card class="stats-card">
                <mat-card-content>
                  <div class="stat">
                    <mat-icon>article</mat-icon>
                    <div class="stat-info">
                      <h3>{{ totalPosts() }}</h3>
                      <p>Total Posts</p>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
              
              <mat-card class="stats-card">
                <mat-card-content>
                  <div class="stat">
                    <mat-icon>visibility</mat-icon>
                    <div class="stat-info">
                      <h3>{{ publishedPosts() }}</h3>
                      <p>Published</p>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
              
              <mat-card class="stats-card">
                <mat-card-content>
                  <div class="stat">
                    <mat-icon>draft</mat-icon>
                    <div class="stat-info">
                      <h3>{{ draftPosts() }}</h3>
                      <p>Drafts</p>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
            
            <div class="coming-soon">
              <mat-icon>timeline</mat-icon>
              <h3>Analytics Coming Soon</h3>
              <p>View metrics, engagement stats, and performance data for your posts.</p>
            </div>
          </div>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>settings</mat-icon>
            Settings
          </ng-template>
          
          <div class="tab-content">
            <div class="settings-section">
              <h2>Profile Settings</h2>
              <mat-card>
                <mat-card-content>
                  <div class="profile-info">
                    <div class="profile-field">
                      <label>Email:</label>
                      <span>{{ authService.currentUser()?.email }}</span>
                    </div>
                    <div class="profile-field">
                      <label>Name:</label>
                      <span>{{ authService.currentUser()?.firstName }} {{ authService.currentUser()?.lastName }}</span>
                    </div>
                    <div class="profile-field">
                      <label>Role:</label>
                      <span class="role-badge">{{ authService.currentUser()?.role }}</span>
                    </div>
                  </div>
                </mat-card-content>
                <mat-card-actions>
                  <button mat-button disabled>
                    <mat-icon>edit</mat-icon>
                    Edit Profile (Coming Soon)
                  </button>
                </mat-card-actions>
              </mat-card>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styleUrl: './dashboard.component.scss',
  imports: [
    CommonModule,
    RouterModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatBadgeModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ]
})
export class AuthorDashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly postService = inject(PostService);
  private readonly router = inject(Router);
  
  readonly posts = signal<PostWithAuthor[]>([]);
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  
  // Computed values
  readonly totalPosts = computed(() => this.posts().length);
  readonly publishedPosts = computed(() => this.posts().filter(p => p.published).length);
  readonly draftPosts = computed(() => this.posts().filter(p => !p.published).length);
  
  ngOnInit(): void {
    this.loadPosts();
  }
  
  private loadPosts(): void {
    this.isLoading.set(true);
    this.error.set(null);
    
    this.postService.getAuthorPosts({ page: 1, limit: 50, status: 'all' }).subscribe({
      next: (response) => {
        this.posts.set(response.posts);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load posts:', error);
        this.error.set('Failed to load posts. Please try again.');
        this.isLoading.set(false);
      }
    });
  }
  
  onTabChange(event: any): void {
    // Handle tab change if needed
    console.log('Tab changed:', event);
  }
  
  createNewPost(): void {
    this.router.navigate(['/author/editor']);
  }
  
  editPost(postId: string): void {
    this.router.navigate(['/author/editor', postId]);
  }
  
  viewPost(slug: string): void {
    // Open post in new tab
    window.open(`/blog/${slug}`, '_blank');
  }
  
  togglePostStatus(postId: string, published: boolean): void {
    this.postService.updatePostStatus(postId, published).subscribe({
      next: (updatedPost) => {
        // Update the post in the local array
        const posts = this.posts();
        const index = posts.findIndex(p => p.id === postId);
        if (index !== -1) {
          posts[index] = updatedPost;
          this.posts.set([...posts]);
        }
      },
      error: (error) => {
        console.error('Failed to update post status:', error);
        this.error.set('Failed to update post status. Please try again.');
      }
    });
  }
  
  duplicatePost(postId: string): void {
    // TODO: Implement post duplication
    console.log('Duplicate post:', postId);
  }
  
  deletePost(postId: string): void {
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      this.postService.deletePost(postId).subscribe({
        next: () => {
          // Remove post from local array
          const posts = this.posts().filter(p => p.id !== postId);
          this.posts.set(posts);
        },
        error: (error) => {
          console.error('Failed to delete post:', error);
          this.error.set('Failed to delete post. Please try again.');
        }
      });
    }
  }
}