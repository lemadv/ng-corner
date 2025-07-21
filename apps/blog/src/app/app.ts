import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { BlogPostsStore } from './store/blog-posts.store';

@Component({
  imports: [
    RouterModule,
    NavbarComponent,
    FooterComponent
  ],
  providers: [BlogPostsStore],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'blog';
}
