import { Route } from '@angular/router';
import { blogPostsResolver } from './resolvers/blog-posts.resolver';

export const appRoutes: Route[] = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
    resolve: {
      blogPosts: blogPostsResolver
    }
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact.component').then(m => m.ContactComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
