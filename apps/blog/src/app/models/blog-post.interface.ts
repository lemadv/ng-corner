export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  author: string;
  createdDate: string | Date; // Can be string from API or Date object
  modifiedDate: string | Date; // Can be string from API or Date object
  content: string; // Using string for now, can be HTML or Markdown
  excerpt?: string; // Optional short description for preview
  tags?: string[];
  published: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface BlogPostSearchQuery {
  searchTerm: string;
  tags?: string[];
  author?: string;
  sortBy?: 'createdDate' | 'modifiedDate' | 'title';
  sortOrder?: 'asc' | 'desc';
}