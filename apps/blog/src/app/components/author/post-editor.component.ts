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
      <!-- Floating Header with Glassmorphism Effect -->
      <div class="editor-header">
        <div class="header-content">
          <div class="header-left">
            <button class="back-button" (click)="goBack()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H6m6-7l-7 7 7 7"/>
              </svg>
              <span>Dashboard</span>
            </button>
            <div class="title-section">
              <h1>{{ isEditMode() ? 'Edit Post' : 'Create New Post' }}</h1>
              <p class="subtitle">{{ isEditMode() ? 'Update your existing post' : 'Share your thoughts with the world' }}</p>
            </div>
          </div>

          <div class="header-actions">
            <button
              class="save-button"
              [disabled]="editorForm.invalid || isLoading()"
              (click)="saveDraft()"
            >
              @if (isLoading()) {
              <div class="spinner"></div>
              <span>Saving...</span>
              } @else {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17,21 17,13 7,13 7,21"/>
                <polyline points="7,3 7,8 15,8"/>
              </svg>
              <span>Save Draft</span>
              }
            </button>

            <button
              class="publish-button"
              [disabled]="editorForm.invalid || isLoading()"
              (click)="publishPost()"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                <path d="M2 2l7.586 7.586"/>
                <circle cx="11" cy="11" r="2"/>
              </svg>
              <span>{{ isEditMode() ? 'Update & Publish' : 'Publish' }}</span>
            </button>
          </div>
        </div>
      </div>

      @if (error()) {
      <div class="error-banner">
        {{ error() }}
        <button class="dismiss-button" (click)="clearError()">×</button>
      </div>
      }

      <form [formGroup]="editorForm" class="editor-form">
        <!-- Post Details Card -->
        <div class="post-details-card">
          <div class="card-header">
            <div class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
            </div>
            <div>
              <h3>Post Details</h3>
              <p>Basic information about your post</p>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-field">
              <label for="title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                Title *
              </label>
              <input
                id="title"
                type="text"
                formControlName="title"
                placeholder="Enter an engaging post title..."
                (input)="onTitleChange($event)"
              />
              @if (editorForm.get('title')?.invalid &&
              editorForm.get('title')?.touched) {
              <div class="field-error">Title is required</div>
              }
            </div>

            <div class="form-field">
              <label for="slug">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
                URL Slug *
              </label>
              <input
                id="slug"
                type="text"
                formControlName="slug"
                placeholder="url-friendly-slug"
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

            <div class="form-field full-width">
              <label for="excerpt">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
                Excerpt
              </label>
              <textarea
                id="excerpt"
                formControlName="excerpt"
                placeholder="Write a compelling excerpt that summarizes your post..."
                rows="3"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Content Editor Card -->
        <div class="content-editor-card">
          <div class="editor-header-bar">
            <div class="editor-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 19l7-7 3 3-7 7-3-3z"/>
                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                <path d="M2 2l7.586 7.586"/>
                <circle cx="11" cy="11" r="2"/>
              </svg>
              <span>Content Editor</span>
            </div>
            
            <div class="tab-nav">
              <button
                type="button"
                class="tab-button"
                [class.active]="selectedTabIndex() === 0"
                (click)="selectedTabIndex.set(0)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                <span>Write</span>
              </button>

              <button
                type="button"
                class="tab-button"
                [class.active]="selectedTabIndex() === 1"
                (click)="selectedTabIndex.set(1)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <span>Preview</span>
              </button>

              <button
                type="button"
                class="tab-button"
                [class.active]="selectedTabIndex() === 2"
                (click)="selectedTabIndex.set(2)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                </svg>
                <span>Split</span>
              </button>
            </div>
          </div>

          <!-- Content Editor -->
          <div class="editor-content" [class]="'mode-' + currentEditorMode()">
            <!-- Write Mode -->
            @if (currentEditorMode() === 'edit' || currentEditorMode() ===
            'split') {
            <div class="markdown-editor">
              <div class="editor-toolbar">
                <div class="toolbar-group">
                  <button
                    type="button"
                    class="toolbar-button"
                    (click)="insertMarkdown('**', '**')"
                    title="Bold (Ctrl+B)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
                      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
                    </svg>
                  </button>

                  <button
                    type="button"
                    class="toolbar-button"
                    (click)="insertMarkdown('*', '*')"
                    title="Italic (Ctrl+I)"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="19" y1="4" x2="10" y2="4"/>
                      <line x1="14" y1="20" x2="5" y2="20"/>
                      <line x1="15" y1="4" x2="9" y2="20"/>
                    </svg>
                  </button>

                  <button
                    type="button"
                    class="toolbar-button"
                    (click)="insertMarkdown('~~', '~~')"
                    title="Strikethrough"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M6 16c0 2.2 1.8 4 4 4s4-1.8 4-4c0-1.5-.7-2.8-1.8-3.5-.4-.3-.9-.5-1.5-.5H8.3c-.6 0-1.1-.2-1.5-.5C6.7 15.2 6 14.5 6 13.5c0-2.2 1.8-4 4-4s4 1.8 4 4"/>
                      <line x1="3" y1="12" x2="21" y2="12"/>
                    </svg>
                  </button>
                </div>

                <div class="toolbar-group">
                  <button
                    type="button"
                    class="toolbar-button"
                    (click)="insertMarkdown('## ', '')"
                    title="Header"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M6 12h12"/>
                      <path d="M6 20V4"/>
                      <path d="M18 20V4"/>
                    </svg>
                  </button>

                  <button
                    type="button"
                    class="toolbar-button"
                    (click)="insertMarkdown('[', '](url)')"
                    title="Link"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                    </svg>
                  </button>

                  <button
                    type="button"
                    class="toolbar-button"
                    (click)="insertMarkdown('- ', '')"
                    title="Bullet List"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="8" y1="6" x2="21" y2="6"/>
                      <line x1="8" y1="12" x2="21" y2="12"/>
                      <line x1="8" y1="18" x2="21" y2="18"/>
                      <line x1="3" y1="6" x2="3.01" y2="6"/>
                      <line x1="3" y1="12" x2="3.01" y2="12"/>
                      <line x1="3" y1="18" x2="3.01" y2="18"/>
                    </svg>
                  </button>

                  <button
                    type="button"
                    class="toolbar-button"
                    (click)="insertMarkdown('> ', '')"
                    title="Quote"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
                      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
                    </svg>
                  </button>
                </div>

                <div class="toolbar-group">
                  <button
                    type="button"
                    class="toolbar-button"
                    (click)="insertCodeBlock()"
                    title="Code Block"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="16,18 22,12 16,6"/>
                      <polyline points="8,6 2,12 8,18"/>
                    </svg>
                  </button>

                  <button
                    type="button"
                    class="toolbar-button"
                    (click)="insertInlineCode()"
                    title="Inline Code"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                      <line x1="8" y1="21" x2="16" y2="21"/>
                      <line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                  </button>
                </div>
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
                <div class="preview-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <span>Preview</span>
                </div>
                <div class="word-count">
                  <span>{{ getWordCount() }} words</span>
                </div>
              </div>
              <div class="preview-content">
                @if (editorForm.get('content')?.value) {
                <markdown [data]="editorForm.get('content')?.value"></markdown>
                } @else {
                <div class="empty-preview">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10,9 9,9 8,9"/>
                  </svg>
                  <h3>Start writing your post</h3>
                  <p>Your content will appear here as you type. Use Markdown syntax for rich formatting.</p>
                </div>
                }
              </div>
            </div>
            }
          </div>
        </div>

        <!-- SEO Meta Information Card -->
        <div class="meta-info-card">
          <div class="card-header">
            <div class="card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </div>
            <div>
              <h3>SEO & Meta Information</h3>
              <p>Optimize your post for search engines and social media</p>
            </div>
          </div>

          <div class="meta-fields">
            <div class="form-field">
              <label for="metaTitle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <path d="M9 9h6v6H9z"/>
                </svg>
                Meta Title
              </label>
              <input
                id="metaTitle"
                type="text"
                formControlName="metaTitle"
                placeholder="SEO title (leave empty to use post title)"
                maxlength="60"
              />
              <div class="field-hint" [class.warning]="getMetaTitleLength() > 50" [class.danger]="getMetaTitleLength() > 60">
                <span>{{ getMetaTitleLength() }}/60 characters</span>
                @if (getMetaTitleLength() > 50 && getMetaTitleLength() <= 60) {
                  <span class="hint-text">• Nearly at the limit</span>
                } @else if (getMetaTitleLength() > 60) {
                  <span class="hint-text">• Too long, will be truncated</span>
                } @else {
                  <span class="hint-text">• Good length for SEO</span>
                }
              </div>
            </div>

            <div class="form-field">
              <label for="metaDescription">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
                Meta Description
              </label>
              <textarea
                id="metaDescription"
                formControlName="metaDescription"
                placeholder="Write a compelling description that will appear in search results..."
                maxlength="160"
                rows="3"
              ></textarea>
              <div class="field-hint" [class.warning]="getMetaDescriptionLength() > 140" [class.danger]="getMetaDescriptionLength() > 160">
                <span>{{ getMetaDescriptionLength() }}/160 characters</span>
                @if (getMetaDescriptionLength() > 140 && getMetaDescriptionLength() <= 160) {
                  <span class="hint-text">• Nearly at the limit</span>
                } @else if (getMetaDescriptionLength() > 160) {
                  <span class="hint-text">• Too long, will be truncated</span>
                } @else if (getMetaDescriptionLength() > 120) {
                  <span class="hint-text">• Good length for SEO</span>
                } @else if (getMetaDescriptionLength() > 0) {
                  <span class="hint-text">• Consider adding more detail</span>
                }
              </div>
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

  insertInlineCode(): void {
    this.insertMarkdown('`', '`');
  }

  getWordCount(): number {
    const content = this.editorForm.get('content')?.value || '';
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  getMetaTitleLength(): number {
    return (this.editorForm.get('metaTitle')?.value || '').length;
  }

  getMetaDescriptionLength(): number {
    return (this.editorForm.get('metaDescription')?.value || '').length;
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
