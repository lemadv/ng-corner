import { Component, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { createBlogPostsViewModel } from '../../view-models/blog-posts.view-model';

@Component({
  selector: 'app-search',
  imports: [FormsModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss'
})
export class SearchComponent {
  vm = createBlogPostsViewModel();
  localSearchTerm = signal('');

  constructor() {
    // Sync local search term with store
    effect(() => {
      this.localSearchTerm.set(this.vm.searchTerm());
    });
  }

  onSearchChange() {
    this.vm.searchPosts(this.localSearchTerm());
  }

  onSearch() {
    this.vm.searchPosts(this.localSearchTerm());
  }

  clearSearch() {
    this.localSearchTerm.set('');
    this.vm.clearSearch();
  }

  get searchTerm() {
    return this.localSearchTerm;
  }
}