import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { inject } from '@angular/core';
import { pipe, switchMap, tap, catchError, of, debounceTime, distinctUntilChanged } from 'rxjs';
import { BlogPost } from '../models/blog-post.interface';
import { PaginationInfo, BlogPostSearchParams } from '../models/api-response.interface';
import { BlogPostsService } from '../data-access/blog-posts.service';

export interface BlogPostsState {
  posts: BlogPost[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  pagination: PaginationInfo | null;
  hasMore: boolean;
}

const initialState: BlogPostsState = {
  posts: [],
  loading: false,
  error: null,
  searchTerm: '',
  pagination: null,
  hasMore: true
};

export const BlogPostsStore = signalStore(
  withState(initialState),
  withMethods((store, blogPostsService = inject(BlogPostsService)) => ({
    loadPosts: rxMethod<BlogPostSearchParams>(
      pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => patchState(store, { loading: true, error: null })),
        switchMap((params) =>
          blogPostsService.getPosts(params).pipe(
            tap((response) => {
              const isNewSearch = params.page === 1 || !params.page;
              patchState(store, {
                posts: isNewSearch ? response.posts : [...store.posts(), ...response.posts],
                pagination: response.pagination,
                hasMore: response.pagination.hasMore,
                loading: false,
                error: null
              });
            }),
            catchError((error) => {
              patchState(store, {
                loading: false,
                error: error.message || 'Failed to load posts'
              });
              return of(null);
            })
          )
        )
      )
    ),

    loadMorePosts: rxMethod<void>(
      pipe(
        tap(() => {
          const currentPagination = store.pagination();
          if (currentPagination && store.hasMore() && !store.loading()) {
            const nextPage = currentPagination.page + 1;
            const searchTerm = store.searchTerm();

            patchState(store, { loading: true });

            blogPostsService.getPosts({
              page: nextPage,
              limit: currentPagination.limit,
              search: searchTerm || undefined
            }).pipe(
              tap((response) => {
                patchState(store, {
                  posts: [...store.posts(), ...response.posts],
                  pagination: response.pagination,
                  hasMore: response.pagination.hasMore,
                  loading: false
                });
              }),
              catchError((error) => {
                patchState(store, {
                  loading: false,
                  error: error.message || 'Failed to load more posts'
                });
                return of(null);
              })
            ).subscribe();
          }
        })
      )
    ),

    searchPosts: rxMethod<string>(
      pipe(
        debounceTime(500),
        distinctUntilChanged(),
        tap((searchTerm) => {
          patchState(store, {
            searchTerm,
            loading: true,
            error: null
          });

          blogPostsService.getPosts({
            page: 1,
            limit: 10,
            search: searchTerm || undefined
          }).pipe(
            tap((response) => {
              patchState(store, {
                posts: response.posts,
                pagination: response.pagination,
                hasMore: response.pagination.hasMore,
                loading: false
              });
            }),
            catchError((error) => {
              patchState(store, {
                loading: false,
                error: error.message || 'Failed to search posts'
              });
              return of(null);
            })
          ).subscribe();
        })
      )
    ),

    clearSearch: () => {
      patchState(store, { searchTerm: '' });
      blogPostsService.getPosts({ page: 1, limit: 10 }).pipe(
        tap((response) => {
          patchState(store, {
            posts: response.posts,
            pagination: response.pagination,
            hasMore: response.pagination.hasMore,
            loading: false,
            error: null
          });
        }),
        catchError((error) => {
          patchState(store, {
            loading: false,
            error: error.message || 'Failed to load posts'
          });
          return of(null);
        })
      ).subscribe();
    },

    resetStore: () => {
      patchState(store, initialState);
      // test
    }
  }))
);
