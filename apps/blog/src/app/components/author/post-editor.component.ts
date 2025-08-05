import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MarkdownModule } from 'ngx-markdown';
import { Subject, debounceTime, takeUntil } from 'rxjs';
import { PostService, CreatePostRequest, UpdatePostRequest, PostWithAuthor, Tag } from '../../services/post.service';
import { AuthService } from '../../services/auth.service';

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
        <div class="header-title">
          <button mat-icon-button (click)="goBack()" matTooltip="Back to Dashboard">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <h1>{{ isEditMode() ? 'Edit Post' : 'Create New Post' }}</h1>
        </div>
        
        <div class="header-actions">
          <button 
            mat-button 
            color="primary" 
            (click)="saveDraft()" 
            [disabled]="isLoading() || editorForm.invalid"
            matTooltip="Save as Draft"
          >
            <mat-icon>save</mat-icon>
            Save Draft
          </button>
          
          <button 
            mat-raised-button 
            color="primary" 
            (click)="publishPost()" 
            [disabled]="isLoading() || editorForm.invalid"
            matTooltip="Publish Post"
          >
            <mat-icon>publish</mat-icon>
            {{ isEditMode() && currentPost()?.published ? 'Update' : 'Publish' }}
          </button>
        </div>
      </div>

      @if (error()) {
        <div class="error-message">
          <mat-icon>error</mat-icon>
          {{ error() }}
        </div>
      }

      <form [formGroup]="editorForm" class="editor-form">
        <div class="form-row">
          <mat-form-field appearance="outline" class="title-field">
            <mat-label>Post Title</mat-label>
            <input 
              matInput 
              formControlName="title" 
              placeholder="Enter your post title..."
              (input)="onTitleChange()"
            >
            @if (editorForm.get('title')?.invalid && editorForm.get('title')?.touched) {
              <mat-error>Title is required</mat-error>
            }
          </mat-form-field>
          
          <mat-form-field appearance="outline" class="slug-field">
            <mat-label>URL Slug</mat-label>
            <input 
              matInput 
              formControlName="slug" 
              placeholder="post-url-slug"
            >
            <mat-hint>URL-friendly version of the title</mat-hint>
            @if (editorForm.get('slug')?.invalid && editorForm.get('slug')?.touched) {
              <mat-error>
                @if (editorForm.get('slug')?.errors?.['required']) {
                  Slug is required
                } @else if (editorForm.get('slug')?.errors?.['pattern']) {
                  Slug can only contain letters, numbers, and hyphens
                }
              </mat-error>
            }
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="excerpt-field">
            <mat-label>Excerpt (Optional)</mat-label>
            <textarea 
              matInput 
              formControlName="excerpt" 
              rows="3"
              placeholder="Brief summary of your post..."
            ></textarea>
            <mat-hint>This will be shown in post previews and search results</mat-hint>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="meta-field">
            <mat-label>Meta Title (SEO)</mat-label>
            <input 
              matInput 
              formControlName="metaTitle" 
              placeholder="SEO-optimized title..."
            >
          </mat-form-field>
          
          <mat-form-field appearance="outline" class="meta-field">
            <mat-label>Meta Description (SEO)</mat-label>
            <textarea 
              matInput 
              formControlName="metaDescription" 
              rows="2"
              placeholder="Brief description for search engines..."
            ></textarea>
          </mat-form-field>
        </div>

        <div class="editor-tabs">
          <mat-tab-group 
            [(selectedIndex)]="selectedTabIndex" 
            (selectedTabChange)="onTabChange($event)"
          >
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon>edit</mat-icon>
                Editor
              </ng-template>
            </mat-tab>
            
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon>visibility</mat-icon>
                Preview
              </ng-template>
            </mat-tab>
            
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon>view_column</mat-icon>
                Split View
              </ng-template>
            </mat-tab>
          </mat-tab-group>
        </div>

        <div class="editor-content" [class]="editorMode()">
          @switch (editorMode()) {
            @case ('edit') {
              <div class="editor-panel">
                <div class="editor-toolbar">
                  <div class="toolbar-group">
                    <button type="button" mat-icon-button (click)="insertMarkdown('**', '**', 'Bold text')" matTooltip="Bold">
                      <mat-icon>format_bold</mat-icon>
                    </button>
                    <button type="button" mat-icon-button (click)="insertMarkdown('*', '*', 'Italic text')" matTooltip="Italic">
                      <mat-icon>format_italic</mat-icon>
                    </button>
                    <button type="button" mat-icon-button (click)="insertMarkdown('\`', '\`', 'code')" matTooltip="Inline Code">
                      <mat-icon>code</mat-icon>
                    </button>
                  </div>
                  
                  <div class="toolbar-group">
                    <button type="button" mat-icon-button (click)="insertMarkdown('# ', '', 'Heading')" matTooltip="Heading">
                      <mat-icon>title</mat-icon>
                    </button>
                    <button type="button" mat-icon-button (click)="insertMarkdown('[', '](url)', 'Link text')" matTooltip="Link">
                      <mat-icon>link</mat-icon>
                    </button>
                    <button type="button" mat-icon-button (click)="insertMarkdown('![', '](image-url)', 'Alt text')" matTooltip="Image">
                      <mat-icon>image</mat-icon>
                    </button>
                  </div>
                  
                  <div class="toolbar-group">
                    <button type="button" mat-icon-button (click)="insertMarkdown('- ', '', 'List item')" matTooltip="Bullet List">
                      <mat-icon>format_list_bulleted</mat-icon>
                    </button>
                    <button type="button" mat-icon-button (click)="insertMarkdown('1. ', '', 'List item')" matTooltip="Numbered List">
                      <mat-icon>format_list_numbered</mat-icon>
                    </button>
                    <button type="button" mat-icon-button (click)="insertCodeBlock()" matTooltip="Code Block">
                      <mat-icon>code_blocks</mat-icon>
                    </button>
                  </div>
                </div>
                
                <textarea
                  #contentTextarea
                  class="content-editor"
                  formControlName="content"
                  placeholder="Write your post content in Markdown..."
                  (input)="onContentChange()"
                ></textarea>
              </div>
            }
            
            @case ('preview') {
              <div class="preview-panel">
                <div class="preview-content">
                  <markdown [data]="editorForm.get('content')?.value || '# Start writing your post...'"></markdown>
                </div>
              </div>
            }
            
            @case ('split') {
              <div class="split-view">
                <div class="editor-panel">
                  <div class="editor-toolbar">
                    <div class="toolbar-group">
                      <button type="button" mat-icon-button (click)="insertMarkdown('**', '**', 'Bold text')" matTooltip="Bold">
                        <mat-icon>format_bold</mat-icon>
                      </button>
                      <button type="button" mat-icon-button (click)="insertMarkdown('*', '*', 'Italic text')" matTooltip="Italic">
                        <mat-icon>format_italic</mat-icon>
                      </button>
                      <button type="button" mat-icon-button (click)="insertMarkdown('\`', '\`', 'code')" matTooltip="Inline Code">
                        <mat-icon>code</mat-icon>  
                      </button>
                    </div>
                    
                    <div class="toolbar-group">
                      <button type="button" mat-icon-button (click)="insertMarkdown('# ', '', 'Heading')" matTooltip="Heading">
                        <mat-icon>title</mat-icon>
                      </button>
                      <button type="button" mat-icon-button (click)="insertMarkdown('[', '](url)', 'Link text')" matTooltip="Link">
                        <mat-icon>link</mat-icon>
                      </button>
                      <button type="button" mat-icon-button (click)="insertMarkdown('![', '](image-url)', 'Alt text')" matTooltip="Image">
                        <mat-icon>image</mat-icon>
                      </button>
                    </div>
                    
                    <div class="toolbar-group">
                      <button type="button" mat-icon-button (click)="insertMarkdown('- ', '', 'List item')" matTooltip="Bullet List">
                        <mat-icon>format_list_bulleted</mat-icon>
                      </button>
                      <button type="button" mat-icon-button (click)="insertMarkdown('1. ', '', 'List item')" matTooltip="Numbered List">
                        <mat-icon>format_list_numbered</mat-icon>
                      </button>
                      <button type="button" mat-icon-button (click)="insertCodeBlock()" matTooltip="Code Block">
                        <mat-icon>code_blocks</mat-icon>
                      </button>
                    </div>
                  </div>
                  
                  <textarea
                    #contentTextareaSplit
                    class="content-editor"
                    formControlName="content"
                    placeholder="Write your post content in Markdown..."
                    (input)="onContentChange()"
                  ></textarea>
                </div>
                
                <div class="preview-panel">
                  <div class="preview-content">
                    <markdown [data]="editorForm.get('content')?.value || '# Start writing your post...'"></markdown>
                  </div>
                </div>
              </div>
            }
          }
        </div>
      </form>
    </div>
  `,
  styleUrl: './post-editor.component.scss',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatToolbarModule,
    MatTooltipModule,
    MarkdownModule
  ]
})
export class PostEditorComponent implements OnInit, OnDestroy {
  private readonly postService = inject(PostService);
  private readonly authService = inject(AuthService);
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
    
    // Set up auto-save (debounced)
    this.editorForm.valueChanges
      .pipe(
        debounceTime(2000),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.editorForm.valid && this.isEditMode()) {
          this.autoSave();
        }
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private loadPost(postId: string): void {
    this.isLoading.set(true);
    this.error.set(null);
    
    this.postService.getPostById(postId).subscribe({
      next: (post) => {
        this.currentPost.set(post);
        this.populateForm(post);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load post:', error);
        this.error.set('Failed to load post. Please try again.');
        this.isLoading.set(false);
      }
    });
  }
  
  private populateForm(post: PostWithAuthor): void {
    this.editorForm.patchValue({
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt || '',
      metaTitle: post.metaTitle || '',
      metaDescription: post.metaDescription || '',
      tags: post.tags.map(t => t.tag.id)
    });
  }
  
  onTitleChange(): void {
    const title = this.editorForm.get('title')?.value;
    if (title && !this.isEditMode()) {
      // Auto-generate slug from title for new posts
      const slug = this.postService.generateSlug(title);
      this.editorForm.get('slug')?.setValue(slug);
    }
  }
  
  onContentChange(): void {
    // This method can be used for real-time preview updates
    // The preview will update automatically via the form control binding
  }
  
  onTabChange(event: any): void {
    this.selectedTabIndex = event.index;
  }
  
  insertMarkdown(before: string, after: string = '', placeholder: string = ''): void {
    const textarea = document.querySelector('.content-editor') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const replacement = selectedText || placeholder;
    
    const newValue = 
      textarea.value.substring(0, start) + 
      before + replacement + after + 
      textarea.value.substring(end);
    
    this.editorForm.get('content')?.setValue(newValue);
    
    // Set cursor position
    setTimeout(() => {
      const newCursorPos = start + before.length + replacement.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    });
  }
  
  insertCodeBlock(): void {
    const textarea = document.querySelector('.content-editor') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    // Default to typescript for Angular blog
    const codeBlock = `\n\`\`\`typescript\n${selectedText || '// Your code here'}\n\`\`\`\n`;
    
    const newValue = 
      textarea.value.substring(0, start) + 
      codeBlock + 
      textarea.value.substring(end);
    
    this.editorForm.get('content')?.setValue(newValue);
    
    // Set cursor position inside the code block
    setTimeout(() => {
      const newCursorPos = start + codeBlock.indexOf('// Your code here');
      textarea.setSelectionRange(newCursorPos, newCursorPos + '// Your code here'.length);
      textarea.focus();
    });
  }
  
  saveDraft(): void {
    if (this.editorForm.invalid) {
      this.editorForm.markAllAsTouched();
      return;
    }
    
    this.savePost(false);
  }
  
  publishPost(): void {
    if (this.editorForm.invalid) {
      this.editorForm.markAllAsTouched();
      return;
    }
    
    this.savePost(true);
  }
  
  private savePost(published: boolean): void {
    this.isLoading.set(true);
    this.error.set(null);
    
    const formValue = this.editorForm.value;
    const postData = {
      title: formValue.title!,
      slug: formValue.slug!,
      content: formValue.content!,
      excerpt: formValue.excerpt || undefined,
      metaTitle: formValue.metaTitle || undefined,
      metaDescription: formValue.metaDescription || undefined,
      published,
      tags: formValue.tags || []
    };
    
    const saveOperation = this.isEditMode() 
      ? this.postService.updatePost(this.currentPost()!.id, postData as UpdatePostRequest)
      : this.postService.createPost(postData as CreatePostRequest);
    
    saveOperation.subscribe({
      next: (post) => {
        console.log('Post saved:', post);
        this.currentPost.set(post);
        this.isLoading.set(false);
        
        // Show success message and redirect
        const action = this.isEditMode() ? 'updated' : 'created';
        const status = published ? 'published' : 'saved as draft';
        console.log(`Post ${action} and ${status} successfully!`);
        
        // Redirect back to dashboard
        this.router.navigate(['/author/dashboard']);
      },
      error: (error) => {
        console.error('Failed to save post:', error);
        this.error.set(`Failed to save post: ${error.message}`);
        this.isLoading.set(false);
      }
    });
  }
  
  private autoSave(): void {
    // Only auto-save drafts for existing posts
    if (this.isEditMode() && !this.currentPost()?.published) {
      console.log('Auto-saving draft...');
      this.savePost(false);
    }
  }
  
  goBack(): void {
    this.router.navigate(['/author/dashboard']);
  }
}