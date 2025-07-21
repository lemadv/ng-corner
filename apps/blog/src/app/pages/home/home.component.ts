import { Component } from '@angular/core';
import { SearchComponent } from '../../components/search/search.component';
import { BlogPostListComponent } from '../../components/blog-post-list/blog-post-list.component';

@Component({
  selector: 'app-home',
  imports: [SearchComponent, BlogPostListComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {}