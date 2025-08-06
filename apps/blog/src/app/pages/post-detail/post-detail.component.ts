import {
  Component,
  inject,
  OnInit,
  signal,
  effect,
  ChangeDetectionStrategy,
  Injector,
  AfterViewInit,
  PLATFORM_ID,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { MarkdownModule } from 'ngx-markdown';
import { BlogPost } from '../../models/blog-post.interface';
import { BlogPostsService } from '../../data-access/blog-posts.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-post-detail',
  imports: [CommonModule, DatePipe, MarkdownModule],
  templateUrl: './post-detail.component.html',
  styleUrl: './post-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostDetailComponent implements OnInit, AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private blogPostsService = inject(BlogPostsService);
  private injector = inject(Injector);
  private platformId = inject(PLATFORM_ID);

  readonly post = signal<BlogPost | null>(null);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    // Check if post was resolved (from SSR/resolver)
    const resolvedPost = this.route.snapshot.data['post'];
    
    if (resolvedPost) {
      // Post was pre-loaded by resolver
      this.post.set(resolvedPost);
      this.loading.set(false);
    } else {
      // Fallback: Load post if not resolved (shouldn't normally happen)
      effect(
        () => {
          const slug = this.route.snapshot.params['slug'];
          if (slug) {
            this.loadPost(slug);
          }
        },
        { injector: this.injector }
      );
    }
  }

  ngAfterViewInit(): void {
    // Only run in browser
    if (isPlatformBrowser(this.platformId)) {
      // Trigger Prism highlighting after view initialization
      this.highlightCode();
    }
  }

  private highlightCode(): void {
    if (typeof window !== 'undefined' && (window as any).Prism) {
      // Delay highlighting to ensure DOM is ready
      setTimeout(() => {
        (window as any).Prism.highlightAll();
      }, 100);
    }
  }

  private loadPost(slug: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.blogPostsService
      .getPost(slug)
      .pipe(
        catchError((error) => {
          console.error('Error loading post:', error);
          this.error.set('Post not found or failed to load');
          this.loading.set(false);
          return of(null);
        })
      )
      .subscribe((post) => {
        if (post) {
          this.post.set(post);
          // Trigger code highlighting after content is loaded
          setTimeout(() => this.highlightCode(), 100);
        } else {
          this.error.set('Post not found or failed to load');
        }
        this.loading.set(false);
      });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  sharePost(): void {
    if (navigator.share && this.post()) {
      const post = this.post()!;
      navigator.share({
        title: post.title,
        text: post.excerpt || 'Check out this blog post!',
        url: window.location.href,
      });
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  }

  getReadingTime(): number {
    if (!this.post()?.content) return 0;
    const wordsPerMinute = 200;
    const wordCount = this.post()!.content.split(' ').length;
    return Math.ceil(wordCount / wordsPerMinute);
  }
}
