import { Component, inject, OnInit, ElementRef, ViewChild, AfterViewInit, ChangeDetectionStrategy } from '@angular/core';
import { BlogPostCardComponent } from '../blog-post-card/blog-post-card.component';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { createBlogPostsViewModel } from '../../view-models/blog-posts.view-model';

@Component({
  selector: 'app-blog-post-list',
  imports: [BlogPostCardComponent, SkeletonComponent],
  templateUrl: './blog-post-list.component.html',
  styleUrl: './blog-post-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogPostListComponent implements OnInit, AfterViewInit {
  @ViewChild('loadMoreTrigger', { static: false }) loadMoreTrigger!: ElementRef;
  
  vm = createBlogPostsViewModel();
  private intersectionObserver?: IntersectionObserver;

  ngOnInit() {
    // Load initial posts
    this.vm.loadPosts({ page: 1, limit: 10 });
  }

  ngAfterViewInit() {
    this.setupInfiniteScroll();
  }

  ngOnDestroy() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }

  private setupInfiniteScroll() {
    if (!this.loadMoreTrigger?.nativeElement) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && this.vm.canLoadMore()) {
          this.vm.loadMorePosts();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    );

    this.intersectionObserver.observe(this.loadMoreTrigger.nativeElement);
  }

  trackByPostId(index: number, post: any) {
    return post.id;
  }
}