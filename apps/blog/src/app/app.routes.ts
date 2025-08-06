import { Route } from '@angular/router';
import { blogPostsResolver } from './resolvers/blog-posts.resolver';
import { postResolver } from './resolvers/post.resolver';
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
    path: 'post/:slug',
    loadComponent: () => import('./pages/post-detail/post-detail.component').then(m => m.PostDetailComponent),
    resolve: {
      post: postResolver
    }
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
