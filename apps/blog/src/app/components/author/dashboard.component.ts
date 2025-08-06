import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthStore } from '../../store/auth.store';
import { PostStore } from '../../store/post.store';
import { PostWithAuthor } from '../../services/post.service';

@Component({
  selector: 'app-author-dashboard',
  template: `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h1>Author Dashboard</h1>
        <p class="welcome-message">
          Welcome back, {{ authStore.currentUser()?.firstName || 'Author' }}! 
          Manage your blog posts and create new content.
        </p>
      </div>

      <div class="dashboard-tabs">
        <div class="tab-nav">
          <button 
            class="tab-button" 
            [class.active]="activeTab() === 0"
            (click)="setActiveTab(0)">
            <svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            My Posts
            @if (totalPosts() > 0) {
              <span class="tab-badge">{{ totalPosts() }}</span>
            }
          </button>
          
          <button 
            class="tab-button" 
            [class.active]="activeTab() === 1"
            (click)="setActiveTab(1)">
            <svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
            </svg>
            Analytics
          </button>
          
          <button 
            class="tab-button" 
            [class.active]="activeTab() === 2"
            (click)="setActiveTab(2)">
            <svg class="tab-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </svg>
            Settings
          </button>
        </div>

        <!-- Posts Tab -->
        @if (activeTab() === 0) {
          <div class="tab-content">
            <div class="tab-header">
              <h2>My Posts</h2>
              <div class="tab-actions">
                <button class="primary-button" (click)="createNewPost()">
                  <svg class="button-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                  New Post
                </button>
              </div>
            </div>

            @if (isLoading()) {
              <div class="loading-container">
                <div class="spinner"></div>
                <p>Loading your posts...</p>
              </div>
            } @else if (posts().length === 0) {
              <div class="empty-state">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                <h3>No posts yet</h3>
                <p>Create your first blog post to get started!</p>
                <button class="primary-button" (click)="createNewPost()">
                  <svg class="button-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                  Create First Post
                </button>
              </div>
            } @else {
              <div class="posts-grid">
                @for (post of posts(); track post.id) {
                  <div class="post-card">
                    <div class="post-header">
                      <h3 class="post-title">{{ post.title }}</h3>
                      <div class="post-meta">
                        <span class="post-status" [class]="post.published ? 'published' : 'draft'">
                          <svg class="status-icon" viewBox="0 0 24 24" fill="currentColor">
                            @if (post.published) {
                              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                            } @else {
                              <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                            }
                          </svg>
                          {{ post.published ? 'Published' : 'Draft' }}
                        </span>
                        <span class="post-date">
                          {{ post.published ? 
                            (post.publishedAt | date:'MMM d, y') : 
                            (post.updatedAt | date:'MMM d, y') 
                          }}
                        </span>
                      </div>
                    </div>
                    
                    <div class="post-content">
                      @if (post.excerpt) {
                        <p class="post-excerpt">{{ post.excerpt }}</p>
                      }
                      
                      @if (post.tags && post.tags.length > 0) {
                        <div class="post-tags">
                          @for (tagRelation of post.tags; track tagRelation.tag.id) {
                            <span class="tag-chip">{{ tagRelation.tag.name }}</span>
                          }
                        </div>
                      }
                    </div>
                    
                    <div class="post-actions">
                      <button class="action-button" (click)="editPost(post.id)">
                        <svg class="button-icon" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                        Edit
                      </button>
                      
                      @if (post.published) {
                        <button class="action-button" (click)="viewPost(post.slug)">
                          <svg class="button-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                          </svg>
                          View
                        </button>
                        <button class="action-button" (click)="togglePostStatus(post.id, false)">
                          <svg class="button-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                          </svg>
                          Unpublish
                        </button>
                      } @else {
                        <button class="action-button primary" (click)="togglePostStatus(post.id, true)">
                          <svg class="button-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5 4v3h5.5v12h3V7H19V4z"/>
                          </svg>
                          Publish
                        </button>
                      }
                      
                      <div class="menu-container">
                        <button class="menu-trigger" (click)="toggleMenu(post.id)">
                          <svg class="button-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                          </svg>
                        </button>
                        
                        @if (openMenuId() === post.id) {
                          <div class="dropdown-menu" (click)="closeMenu()">
                            <button class="menu-item" (click)="duplicatePost(post.id)">
                              <svg class="menu-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                              </svg>
                              Duplicate
                            </button>
                            <button class="menu-item danger" (click)="deletePost(post.id)">
                              <svg class="menu-icon" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                              </svg>
                              Delete
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Analytics Tab -->
        @if (activeTab() === 1) {
          <div class="tab-content">
            <div class="analytics-cards">
              <div class="stats-card">
                <div class="stat">
                  <svg class="stat-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                  </svg>
                  <div class="stat-info">
                    <h3>{{ totalPosts() }}</h3>
                    <p>Total Posts</p>
                  </div>
                </div>
              </div>
              
              <div class="stats-card">
                <div class="stat">
                  <svg class="stat-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                  <div class="stat-info">
                    <h3>{{ publishedPosts() }}</h3>
                    <p>Published</p>
                  </div>
                </div>
              </div>
              
              <div class="stats-card">
                <div class="stat">
                  <svg class="stat-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h8c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 18H8v-1h4v1zm0-3H8v-1h4v1zm0-3H8V9h4v5z"/>
                  </svg>
                  <div class="stat-info">
                    <h3>{{ draftPosts() }}</h3>
                    <p>Drafts</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="coming-soon">
              <svg class="coming-soon-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
              </svg>
              <h3>Analytics Coming Soon</h3>
              <p>View metrics, engagement stats, and performance data for your posts.</p>
            </div>
          </div>
        }

        <!-- Settings Tab -->
        @if (activeTab() === 2) {
          <div class="tab-content">
            <div class="settings-section">
              <h2>Profile Settings</h2>
              <div class="settings-card">
                <div class="profile-info">
                  <div class="profile-field">
                    <label>Email:</label>
                    <span>{{ authStore.currentUser()?.email }}</span>
                  </div>
                  <div class="profile-field">
                    <label>Name:</label>
                    <span>{{ authStore.currentUser()?.firstName }} {{ authStore.currentUser()?.lastName }}</span>
                  </div>
                  <div class="profile-field">
                    <label>Role:</label>
                    <span class="role-badge">{{ authStore.currentUser()?.role }}</span>
                  </div>
                </div>
                <div class="card-actions">
                  <button class="action-button" disabled>
                    <svg class="button-icon" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                    Edit Profile (Coming Soon)
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './dashboard.component.scss',
  imports: [
    CommonModule,
    RouterModule
  ]
})
export class AuthorDashboardComponent implements OnInit {
  readonly authStore = inject(AuthStore);
  readonly postStore = inject(PostStore);
  private readonly router = inject(Router);
  readonly activeTab = signal(0);
  readonly openMenuId = signal<string | null>(null);
  
  // Computed values from store
  readonly posts = this.postStore.posts;
  readonly isLoading = this.postStore.isLoading;
  readonly error = this.postStore.error;
  readonly totalPosts = this.postStore.totalPosts;
  readonly publishedPosts = this.postStore.publishedPosts;
  readonly draftPosts = this.postStore.draftPosts;
  
  ngOnInit(): void {
    this.loadPosts();
  }
  
  private loadPosts(): void {
    this.postStore.loadAuthorPosts({ page: 1, limit: 50, status: 'all' });
  }
  
  setActiveTab(index: number): void {
    this.activeTab.set(index);
  }
  
  toggleMenu(postId: string): void {
    this.openMenuId.set(this.openMenuId() === postId ? null : postId);
  }
  
  closeMenu(): void {
    this.openMenuId.set(null);
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
    this.postStore.updatePostStatus({ postId, published });
  }
  
  duplicatePost(postId: string): void {
    // TODO: Implement post duplication
    console.log('Duplicate post:', postId);
  }
  
  deletePost(postId: string): void {
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      this.postStore.deletePost(postId);
    }
  }
}