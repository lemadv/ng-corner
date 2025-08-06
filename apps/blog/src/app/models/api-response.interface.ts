export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface BlogPostsResponse {
  posts: any[]; // Will be BlogPost[] but avoiding circular dependency
  pagination: PaginationInfo;
}

export interface BlogPostSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  tag?: string;
}