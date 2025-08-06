import { inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { computed } from '@angular/core';
import { pipe, switchMap, tap, catchError, EMPTY } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { AuthStore } from './auth.store';

/**
 * Post interfaces
 */
export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface PostTag {
  tag: Tag;
}

export interface PostWithAuthor {
  id: string;
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  published: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  author: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  tags?: PostTag[];
}

export interface PostsResponse {
  posts: PostWithAuthor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreatePostRequest {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
  published?: boolean;
}

export interface UpdatePostRequest extends Partial<CreatePostRequest> {
  id: string;
}

/**
 * Post state interface
 */
export interface PostState {
  posts: PostWithAuthor[];
  currentPost: PostWithAuthor | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  availableTags: Tag[];
}

/**
 * Initial post state
 */
export const initialPostState: PostState = {
  posts: [],
  currentPost: null,
  isLoading: false,
  error: null,
  pagination: null,
  availableTags: [],
};

/**
 * Post Feature Store
 * Manages all post-related state and operations
 */
export const PostStore = signalStore(
  { providedIn: 'root' },
  withState(initialPostState),
  withComputed((store) => ({
    publishedPosts: computed(() => store.posts().filter(p => p.published)),
    draftPosts: computed(() => store.posts().filter(p => !p.published)),
    totalPosts: computed(() => store.posts().length),
    hasNextPage: computed(() => {
      const pagination = store.pagination();
      return pagination ? pagination.page < pagination.totalPages : false;
    }),
    hasPreviousPage: computed(() => {
      const pagination = store.pagination();
      return pagination ? pagination.page > 1 : false;
    }),
  })),
  withMethods((store) => {
    const http = inject(HttpClient);
    const authStore = inject(AuthStore);
    const baseUrl = '/api/posts';

    return {
      // State updates
      setLoading(isLoading: boolean): void {
        patchState(store, { isLoading });
      },

      setError(error: string | null): void {
        patchState(store, { error });
      },

      setPosts(posts: PostWithAuthor[]): void {
        patchState(store, { posts });
      },

      setCurrentPost(post: PostWithAuthor | null): void {
        patchState(store, { currentPost: post });
      },

      setPagination(pagination: PostState['pagination']): void {
        patchState(store, { pagination });
      },

      setTags(tags: Tag[]): void {
        patchState(store, { availableTags: tags });
      },

      clearError(): void {
        patchState(store, { error: null });
      },

      // Load author posts
      loadAuthorPosts: rxMethod<{
        page?: number;
        limit?: number;
        status?: 'all' | 'published' | 'draft';
      }>(
        pipe(
          tap(() => {
            patchState(store, { isLoading: true, error: null });
          }),
          switchMap((params) => {
            const queryParams = new URLSearchParams({
              page: (params.page || 1).toString(),
              limit: (params.limit || 10).toString(),
              ...(params.status && params.status !== 'all' && { status: params.status }),
            });

            return http.get<PostsResponse>(`${baseUrl}/author/my-posts?${queryParams}`).pipe(
              tapResponse({
                next: (response) => {
                  patchState(store, {
                    posts: response.posts,
                    pagination: response.pagination,
                    isLoading: false,
                  });
                },
                error: (error: HttpErrorResponse) => {
                  let errorMessage = 'Failed to load posts';
                  if (error.error?.message) {
                    errorMessage = error.error.message;
                  }
                  patchState(store, {
                    isLoading: false,
                    error: errorMessage,
                  });
                },
              })
            );
          })
        )
      ),

      // Load public posts
      loadPosts: rxMethod<{
        page?: number;
        limit?: number;
        search?: string;
        tag?: string;
      }>(
        pipe(
          tap(() => {
            patchState(store, { isLoading: true, error: null });
          }),
          switchMap((params) => {
            const queryParams = new URLSearchParams({
              page: (params.page || 1).toString(),
              limit: (params.limit || 10).toString(),
              ...(params.search && { search: params.search }),
              ...(params.tag && { tag: params.tag }),
            });

            return http.get<PostsResponse>(`${baseUrl}?${queryParams}`).pipe(
              tapResponse({
                next: (response) => {
                  patchState(store, {
                    posts: response.posts,
                    pagination: response.pagination,
                    isLoading: false,
                  });
                },
                error: (error: HttpErrorResponse) => {
                  let errorMessage = 'Failed to load posts';
                  if (error.error?.message) {
                    errorMessage = error.error.message;
                  }
                  patchState(store, {
                    isLoading: false,
                    error: errorMessage,
                  });
                },
              })
            );
          })
        )
      ),

      // Update post status
      updatePostStatus: rxMethod<{ postId: string; published: boolean }>(
        pipe(
          switchMap(({ postId, published }) =>
            http.patch<{ message: string; post: PostWithAuthor }>(`${baseUrl}/${postId}/publish`, { published }).pipe(
              tapResponse({
                next: (response: { message: string; post: PostWithAuthor }) => {
                  const updatedPost = response.post;
                  const posts = store.posts();
                  const index = posts.findIndex(p => p.id === postId);
                  if (index !== -1) {
                    const updatedPosts = [...posts];
                    updatedPosts[index] = updatedPost;
                    patchState(store, { posts: updatedPosts });
                  }
                },
                error: (error: HttpErrorResponse) => {
                  let errorMessage = 'Failed to update post status';
                  if (error.error?.message) {
                    errorMessage = error.error.message;
                  }
                  patchState(store, { error: errorMessage });
                },
              })
            )
          )
        )
      ),

      // Delete post
      deletePost: rxMethod<string>(
        pipe(
          switchMap((postId) =>
            http.delete(`${baseUrl}/${postId}`).pipe(
              tapResponse({
                next: () => {
                  const posts = store.posts().filter(p => p.id !== postId);
                  patchState(store, { posts });
                },
                error: (error: HttpErrorResponse) => {
                  let errorMessage = 'Failed to delete post';
                  if (error.error?.message) {
                    errorMessage = error.error.message;
                  }
                  patchState(store, { error: errorMessage });
                },
              })
            )
          )
        )
      ),

      // Create post
      createPost: rxMethod<CreatePostRequest>(
        pipe(
          tap(() => {
            patchState(store, { isLoading: true, error: null });
          }),
          switchMap((postData) =>
            http.post<{ message: string; post: PostWithAuthor }>(`${baseUrl}`, postData).pipe(
              tapResponse({
                next: (response) => {
                  const newPost = response.post;
                  const posts = [newPost, ...store.posts()];
                  patchState(store, {
                    posts,
                    currentPost: newPost,
                    isLoading: false,
                  });
                },
                error: (error: HttpErrorResponse) => {
                  let errorMessage = 'Failed to create post';
                  if (error.error?.message) {
                    errorMessage = error.error.message;
                  }
                  patchState(store, {
                    isLoading: false,
                    error: errorMessage,
                  });
                },
              })
            )
          )
        )
      ),

      // Load tags
      loadTags: rxMethod<void>(
        pipe(
          switchMap(() =>
            http.get<Tag[]>(`${baseUrl}/tags`).pipe(
              tapResponse({
                next: (tags) => {
                  patchState(store, { availableTags: tags });
                },
                error: (error: HttpErrorResponse) => {
                  console.error('Failed to load tags:', error);
                },
              })
            )
          )
        )
      ),

      // Load single post
      loadPost: rxMethod<{ postId: string }>(
        pipe(
          tap(() => {
            patchState(store, { isLoading: true, error: null });
          }),
          switchMap(({ postId }) =>
            http.get<PostWithAuthor>(`${baseUrl}/edit/${postId}`).pipe(
              tapResponse({
                next: (post) => {
                  patchState(store, {
                    currentPost: post,
                    isLoading: false,
                  });
                },
                error: (error: HttpErrorResponse) => {
                  let errorMessage = 'Failed to load post';
                  if (error.error?.message) {
                    errorMessage = error.error.message;
                  }
                  patchState(store, {
                    isLoading: false,
                    error: errorMessage,
                  });
                },
              })
            )
          )
        )
      ),

      // Update post
      updatePost: rxMethod<{
        postId: string;
        title: string;
        slug: string;
        content: string;
        excerpt?: string | null;
        metaTitle?: string | null;
        metaDescription?: string | null;
        published: boolean;
      }>(
        pipe(
          tap(() => {
            patchState(store, { isLoading: true, error: null });
          }),
          switchMap(({ postId, ...updateData }) =>
            http.put<{ message: string; post: PostWithAuthor }>(`${baseUrl}/${postId}`, updateData).pipe(
              tapResponse({
                next: (response) => {
                  const updatedPost = response.post;
                  // Update the post in the posts array
                  const posts = store.posts();
                  const index = posts.findIndex(p => p.id === postId);
                  if (index !== -1) {
                    const updatedPosts = [...posts];
                    updatedPosts[index] = updatedPost;
                    patchState(store, {
                      posts: updatedPosts,
                      currentPost: updatedPost,
                      isLoading: false,
                    });
                  } else {
                    patchState(store, {
                      currentPost: updatedPost,
                      isLoading: false,
                    });
                  }
                },
                error: (error: HttpErrorResponse) => {
                  let errorMessage = 'Failed to update post';
                  if (error.error?.message) {
                    errorMessage = error.error.message;
                  }
                  patchState(store, {
                    isLoading: false,
                    error: errorMessage,
                  });
                },
              })
            )
          )
        )
      ),

      // Helper methods
      getPostById(id: string): PostWithAuthor | undefined {
        return store.posts().find(post => post.id === id);
      },

      getPostBySlug(slug: string): PostWithAuthor | undefined {
        return store.posts().find(post => post.slug === slug);
      },
    };
  })
);

export type PostStoreType = InstanceType<typeof PostStore>;