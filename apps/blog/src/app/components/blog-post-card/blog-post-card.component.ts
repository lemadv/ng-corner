import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BlogPost } from '../../models/blog-post.interface';

@Component({
  selector: 'app-blog-post-card',
  imports: [DatePipe, RouterLink],
  templateUrl: './blog-post-card.component.html',
  styleUrl: './blog-post-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogPostCardComponent {
  post = input.required<BlogPost>();

  excerpt = computed(() => {
    const content = this.post().content;
    const maxLength = 150;
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength).trim() + '...';
  });

  createdDate = computed(() => {
    const date = this.post().createdDate;
    return typeof date === 'string' ? new Date(date) : date;
  });

  modifiedDate = computed(() => {
    const date = this.post().modifiedDate;
    return typeof date === 'string' ? new Date(date) : date;
  });
}
