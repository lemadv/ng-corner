import {
  Component,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
  effect,
  Injector,
} from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { PostWithAuthor, Tag } from '../../services/post.service';
import { AuthStore } from '../../store/auth.store';
import { PostStore } from '../../store/post.store';

@Component({
  selector: 'app-post-editor',
  template: `
    <div class="editor-container">
      <div class="editor-header">
        <div class="header-left">
          <button class="back-button" (click)="goBack()">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
              />
            </svg>
            Back to Dashboard
          </button>
          <h1>{{ isEditMode() ? 'Edit Post' : 'Create New Post' }}</h1>
        </div>

        <div class="header-actions">
          <button
            class="save-button"
            [disabled]="editorForm.invalid || isLoading()"
            (click)="saveDraft()"
          >
            @if (isLoading()) {
            <div class="spinner"></div>
            Saving... } @else { Save Draft }
          </button>

          <button
            class="publish-button"
            [disabled]="editorForm.invalid || isLoading()"
            (click)="publishPost()"
          >
            {{ isEditMode() ? 'Update & Publish' : 'Publish' }}
          </button>
        </div>
      </div>

      @if (error()) {
      <div class="error-banner">
        {{ error() }}
        <button class="dismiss-button" (click)="clearError()">×</button>
      </div>
      }

      <form [formGroup]="editorForm" class="editor-form">
        <!-- Post Details -->
        <div class="post-details">
          <div class="form-field">
            <label for="title">Title *</label>
            <input
              id="title"
              type="text"
              formControlName="title"
              placeholder="Enter post title..."
              (input)="onTitleChange($event)"
            />
            @if (editorForm.get('title')?.invalid &&
            editorForm.get('title')?.touched) {
            <div class="field-error">Title is required</div>
            }
          </div>

          <div class="form-field">
            <label for="slug">URL Slug *</label>
            <input
              id="slug"
              type="text"
              formControlName="slug"
              placeholder="url-slug"
            />
            @if (editorForm.get('slug')?.invalid &&
            editorForm.get('slug')?.touched) {
            <div class="field-error">
              @if (editorForm.get('slug')?.errors?.['required']) { Slug is
              required } @else if (editorForm.get('slug')?.errors?.['pattern'])
              { Slug can only contain lowercase letters, numbers, and hyphens }
            </div>
            }
          </div>

          <div class="form-field">
            <label for="excerpt">Excerpt</label>
            <textarea
              id="excerpt"
              formControlName="excerpt"
              placeholder="Brief description for previews..."
              rows="3"
            ></textarea>
          </div>
        </div>

        <!-- Editor Tabs -->
        <div class="editor-tabs">
          <div class="tab-nav">
            <button
              type="button"
              class="tab-button"
              [class.active]="selectedTabIndex() === 0"
              (click)="selectedTabIndex.set(0)"
            >
              Write
            </button>

            <button
              type="button"
              class="tab-button"
              [class.active]="selectedTabIndex() === 1"
              (click)="selectedTabIndex.set(1)"
            >
              Preview
            </button>

            <button
              type="button"
              class="tab-button"
              [class.active]="selectedTabIndex() === 2"
              (click)="selectedTabIndex.set(2)"
            >
              Split View
            </button>
          </div>

          <!-- Content Editor -->
          <div class="editor-content" [class]="'mode-' + currentEditorMode()">
            <!-- Write Mode -->
            @if (currentEditorMode() === 'edit' || currentEditorMode() ===
            'split') {
            <div class="markdown-editor">
              <div class="editor-toolbar">
                <button
                  type="button"
                  class="toolbar-button"
                  (click)="insertMarkdown('**', '**')"
                  title="Bold"
                >
                  B
                </button>

                <button
                  type="button"
                  class="toolbar-button"
                  (click)="insertMarkdown('*', '*')"
                  title="Italic"
                >
                  I
                </button>

                <button
                  type="button"
                  class="toolbar-button"
                  (click)="insertMarkdown('## ', '')"
                  title="Header"
                >
                  H
                </button>

                <button
                  type="button"
                  class="toolbar-button"
                  (click)="insertMarkdown('[', '](url)')"
                  title="Link"
                >
                  Link
                </button>

                <button
                  type="button"
                  class="toolbar-button"
                  (click)="insertCodeBlock()"
                  title="Code Block"
                >
                  Code
                </button>
              </div>

              <textarea
                formControlName="content"
                placeholder="Write your post content in Markdown..."
                class="content-textarea"
                rows="20"
              ></textarea>

              @if (editorForm.get('content')?.invalid &&
              editorForm.get('content')?.touched) {
              <div class="field-error">Content is required</div>
              }
            </div>
            }

            <!-- Preview Mode -->
            @if (currentEditorMode() === 'preview' || currentEditorMode() ===
            'split') {
            <div class="markdown-preview">
              <div class="preview-header">
                <h2>Preview</h2>
              </div>
              <div class="preview-content">
                @if (editorForm.get('content')?.value) {
                <markdown [data]="editorForm.get('content')?.value"></markdown>
                } @else {
                <p class="empty-preview">Start writing to see the preview...</p>
                }
              </div>
            </div>
            }
          </div>
        </div>

        <!-- Meta Information -->
        <div class="meta-section">
          <h3>SEO & Meta Information</h3>

          <div class="form-field">
            <label for="metaTitle">Meta Title</label>
            <input
              id="metaTitle"
              type="text"
              formControlName="metaTitle"
              placeholder="SEO title (leave empty to use post title)"
              maxlength="60"
            />
            <div class="field-hint">
              {{ (editorForm.get('metaTitle')?.value || '').length }}/60
              characters
            </div>
          </div>

          <div class="form-field">
            <label for="metaDescription">Meta Description</label>
            <textarea
              id="metaDescription"
              formControlName="metaDescription"
              placeholder="Brief description for search engines..."
              maxlength="160"
              rows="3"
            ></textarea>
            <div class="field-hint">
              {{ (editorForm.get('metaDescription')?.value || '').length }}/160
              characters
            </div>
          </div>
        </div>
      </form>
    </div>
  `,
  styleUrl: './post-editor.component.scss',
  imports: [CommonModule, ReactiveFormsModule, MarkdownModule],
})
export class PostEditorComponent implements OnInit, OnDestroy {
  readonly authStore = inject(AuthStore);
  readonly postStore = inject(PostStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly injector = inject(Injector);
  private readonly destroy$ = new Subject<void>();

  // Use store signals
  readonly isLoading = this.postStore.isLoading;
  readonly error = this.postStore.error;
  readonly currentPost = this.postStore.currentPost;
  readonly availableTags = this.postStore.availableTags;

  readonly selectedTabIndex = signal(0);
  readonly editorModes = ['edit', 'preview', 'split'] as const;
  readonly currentEditorMode = computed(
    () => this.editorModes[this.selectedTabIndex()]
  );

  readonly isEditMode = computed(() => !!this.currentPost());

  readonly editorForm = this.fb.group({
    title: ['', [Validators.required]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    content: ['', [Validators.required]],
    excerpt: [''],
    metaTitle: [''],
    metaDescription: [''],
    tags: [[] as string[]],
  });

  ngOnInit(): void {
    // Check if we're editing an existing post
    const postId = this.route.snapshot.params['id'];
    if (postId) {
      this.loadPost(postId);
    }

    // Auto-save functionality
    this.editorForm.valueChanges
      .pipe(debounceTime(2000), takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.editorForm.valid && this.isEditMode()) {
          this.saveDraft();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPost(postId: string): void {
    this.postStore.loadPost({ postId });

    // Update form when post loads using effect
    const updateFormEffect = effect(
      () => {
        const post = this.currentPost();
        if (post && post.id === postId) {
          this.editorForm.patchValue({
            title: post.title,
            slug: post.slug,
            content: post.content,
            excerpt: post.excerpt,
            metaTitle: post.metaTitle,
            metaDescription: post.metaDescription,
            // TODO: Handle tags when tag system is implemented
          });
          // Destroy effect after form is populated
          updateFormEffect.destroy();
        }
      },
      { injector: this.injector }
    );
  }

  onTitleChange(event: Event): void {
    const title = (event.target as HTMLInputElement).value;
    if (!this.isEditMode() && title) {
      // Generate slug from title for new posts
      const slug = this.generateSlug(title);
      this.editorForm.patchValue({ slug });
    }
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim()
      .substring(0, 100); // Limit length
  }

  insertMarkdown(before: string, after: string): void {
    const textarea = document.querySelector(
      '.content-textarea'
    ) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    const newText = before + selectedText + after;
    const currentContent = this.editorForm.get('content')?.value || '';
    const updatedContent =
      currentContent.substring(0, start) +
      newText +
      currentContent.substring(end);

    this.editorForm.patchValue({ content: updatedContent });

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    });
  }

  insertCodeBlock(): void {
    this.insertMarkdown('```\n', '\n```');
  }

  saveDraft(): void {
    if (this.editorForm.valid) {
      const formValue = this.editorForm.value;

      if (this.isEditMode()) {
        // Update existing post
        const postId = this.currentPost()?.id;
        if (postId) {
          this.postStore.updatePost({
            postId,
            title: formValue.title!,
            slug: formValue.slug!,
            content: formValue.content!,
            excerpt: formValue.excerpt || undefined,
            metaTitle: formValue.metaTitle || undefined,
            metaDescription: formValue.metaDescription || undefined,
            published: false,
          });
        }
      } else {
        // Create new post as draft
        this.postStore.createPost({
          title: formValue.title!,
          slug: formValue.slug!,
          content: formValue.content!,
          excerpt: formValue.excerpt || undefined,
          metaTitle: formValue.metaTitle || undefined,
          metaDescription: formValue.metaDescription || undefined,
          published: false,
        });
      }
    }
  }

  publishPost(): void {
    if (this.editorForm.valid) {
      const formValue = this.editorForm.value;

      if (this.isEditMode()) {
        // Update and publish existing post
        const postId = this.currentPost()?.id;
        if (postId) {
          this.postStore.updatePost({
            postId,
            title: formValue.title!,
            slug: formValue.slug!,
            content: formValue.content!,
            excerpt: formValue.excerpt || undefined,
            metaTitle: formValue.metaTitle || undefined,
            metaDescription: formValue.metaDescription || undefined,
            published: true,
          });
        }
      } else {
        // Create and publish new post
        this.postStore.createPost({
          title: formValue.title!,
          slug: formValue.slug!,
          content: formValue.content!,
          excerpt: formValue.excerpt || undefined,
          metaTitle: formValue.metaTitle || undefined,
          metaDescription: formValue.metaDescription || undefined,
          published: true,
        });
      }
    }
  }

  clearError(): void {
    this.postStore.clearError();
  }

  goBack(): void {
    this.router.navigate(['/author/dashboard']);
  }
}
