import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BlogPostCardComponent } from '../blog-post-card/blog-post-card.component';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { createBlogPostsViewModel } from '../../view-models/blog-posts.view-model';

@Component({
  selector: 'app-blog-post-list',
  imports: [BlogPostCardComponent, SkeletonComponent, InfiniteScrollModule],
  templateUrl: './blog-post-list.component.html',
  styleUrl: './blog-post-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogPostListComponent implements OnInit {
  private route = inject(ActivatedRoute);
  vm = createBlogPostsViewModel();

  ngOnInit() {
    // Check if posts were resolved (from SSR/resolver)
    const resolvedPosts = this.route.snapshot.data['blogPosts'];
    
    if (resolvedPosts) {
      // Posts were pre-loaded by resolver, populate the store directly
      this.vm.populateFromResolved(resolvedPosts);
    } else {
      // Fallback: Load initial posts if not resolved
      this.vm.loadPosts({ page: 1, limit: 10 });
    }
  }

  onScrollDown() {
    console.log('🔄 Scroll triggered - canLoadMore:', this.vm.canLoadMore(), 'hasMore:', this.vm.hasMore(), 'loading:', this.vm.loading());
    // This will be called when user scrolls to the bottom
    if (this.vm.canLoadMore()) {
      console.log('📦 Loading more posts...');
      this.vm.loadMorePosts();
    } else {
      console.log('❌ Cannot load more posts');
    }
  }

  trackByPostId(index: number, post: any) {
    return post.id;
  }
}
