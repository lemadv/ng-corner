import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { PostService, CreatePostRequest, UpdatePostRequest, PostWithAuthor, Tag } from '../../services/post.service';
import { AuthStore } from '../../store/auth.store';

interface EditorTab {
  label: string;
  icon: string;
  value: 'edit' | 'preview' | 'split';
}

@Component({
  selector: 'app-post-editor',
  template: `
    <div class="editor-container">
      <div class="editor-header">
        <h1>{{ isEditMode() ? 'Edit Post' : 'Create New Post' }}</h1>
        <p>Post Editor - Coming Soon (Material UI components removed)</p>
        <div class="editor-actions">
          <button class="back-button" (click)="goBack()">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
            Back to Dashboard
          </button>
        </div>
      </div>

      <div class="placeholder-content">
        <p>This component will be rebuilt with custom styling to replace Angular Material components.</p>
        <p>Current functionality:</p>
        <ul>
          <li>Post creation and editing</li>
          <li>Markdown editor with preview</li>
          <li>Meta tags and SEO settings</li>
          <li>Draft and publish workflow</li>
        </ul>
      </div>
    </div>
  `,
  styleUrl: './post-editor.component.scss',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MarkdownModule
  ]
})
export class PostEditorComponent implements OnInit, OnDestroy {
  private readonly postService = inject(PostService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly currentPost = signal<PostWithAuthor | null>(null);
  readonly availableTags = signal<Tag[]>([]);

  selectedTabIndex = 0;

  readonly isEditMode = computed(() => !!this.currentPost());
  readonly editorMode = computed(() => {
    switch (this.selectedTabIndex) {
      case 0: return 'edit';
      case 1: return 'preview';
      case 2: return 'split';
      default: return 'edit';
    }
  });

  readonly editorForm = this.fb.group({
    title: ['', [Validators.required]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    content: ['', [Validators.required]],
    excerpt: [''],
    metaTitle: [''],
    metaDescription: [''],
    tags: [[] as string[]]
  });

  ngOnInit(): void {
    // Check if we're editing an existing post
    const postId = this.route.snapshot.params['id'];
    if (postId) {
      this.loadPost(postId);
    }

    // Auto-save functionality
    this.editorForm.valueChanges
      .pipe(
        debounceTime(2000),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        // Auto-save logic would go here
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPost(postId: string): void {
    this.isLoading.set(true);
    // TODO: Implement getPost method in PostService
    // For now, just show placeholder
    console.log('Loading post:', postId);
    console.log('Loading post:', postId);
    this.isLoading.set(false);
  }

  goBack(): void {
    this.router.navigate(['/author/dashboard']);
  }
}
