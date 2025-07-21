import { computed, inject } from '@angular/core';
import { BlogPostsStore } from '../store/blog-posts.store';

export function createBlogPostsViewModel() {
  const store = inject(BlogPostsStore);

  return {
    // State selectors
    posts: store.posts,
    loading: store.loading,
    error: store.error,
    searchTerm: store.searchTerm,
    pagination: store.pagination,
    hasMore: store.hasMore,

    // Computed selectors
    isEmpty: computed(() => store.posts().length === 0 && !store.loading()),
    isSearching: computed(() => store.searchTerm().trim().length > 0),
    hasResults: computed(() => store.posts().length > 0),
    canLoadMore: computed(() => store.hasMore() && !store.loading()),
    searchResultsCount: computed(() => {
      const pagination = store.pagination();
      return pagination ? pagination.total : 0;
    }),

    // Actions
    loadPosts: store.loadPosts,
    loadMorePosts: store.loadMorePosts,
    searchPosts: store.searchPosts,
    clearSearch: store.clearSearch,
    resetStore: store.resetStore,
    populateFromResolved: store.populateFromResolved
  };
}
