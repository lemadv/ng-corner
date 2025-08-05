import { Route } from '@angular/router';
import { blogPostsResolver } from './resolvers/blog-posts.resolver';
import { authGuard } from './guards/auth.guard';

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
    path: 'login',
    loadComponent: () => import('./components/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'author',
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./components/author/dashboard.component').then(m => m.AuthorDashboardComponent)
      },
      {
        path: 'editor',
        loadComponent: () => import('./components/author/post-editor.component').then(m => m.PostEditorComponent)
      },
      {
        path: 'editor/:id',
        loadComponent: () => import('./components/author/post-editor.component').then(m => m.PostEditorComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
