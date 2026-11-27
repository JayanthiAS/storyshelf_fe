import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { Notification } from '../../core/models/notification.model';
import { NotificationService } from '../../core/services/domain.service';
import { EmptyStateComponent, SpinnerComponent } from '../../shared/layout/layout.components';

@Component({
  selector: 'app-publisher-notifications',
  standalone: true,
  imports: [DatePipe, SpinnerComponent, EmptyStateComponent],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="mb-0">Notifications</h2>
      @if (items().length) {
        <button class="btn btn-outline-secondary btn-sm" type="button" (click)="markAll()">Mark all read</button>
      }
    </div>
    @if (loading()) {
      <app-spinner />
    } @else if (!items().length) {
      <app-empty-state message="No review updates yet. Storyshelf will leave a note here when a book is approved, returned, or taken down." />
    } @else {
      @for (item of items(); track item._id) {
        <div class="card mb-2 p-3" role="button" [class.border-primary]="!item.isRead" (click)="open(item)">
          <div class="d-flex justify-content-between gap-3">
            <strong [class.fw-normal]="item.isRead">{{ item.title }}</strong>
            <small class="text-muted">{{ item.createdAt | date:'short' }}</small>
          </div>
          <p class="mb-0 text-muted">{{ item.body }}</p>
        </div>
      }
    }
  `,
})
export class PublisherNotificationsComponent implements OnInit {
  private service = inject(NotificationService);
  private router = inject(Router);
  loading = signal(true);
  items = signal<Notification[]>([]);

  ngOnInit(): void {
    this.service.list({ limit: 50 }).subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  open(item: Notification): void {
    if (!item.isRead) {
      this.items.update((list) => list.map((entry) => (entry._id === item._id ? { ...entry, isRead: true } : entry)));
      this.service.markRead(item._id).subscribe({
        error: () => this.items.update((list) => list.map((entry) => (entry._id === item._id ? { ...entry, isRead: false } : entry))),
      });
    }
    const bookId = item.metadata?.bookId;
    if (bookId) this.router.navigate(['/publisher/books', bookId]);
  }

  markAll(): void {
    this.items.update((list) => list.map((entry) => ({ ...entry, isRead: true })));
    this.service.markAllRead().subscribe({ error: () => this.ngOnInit() });
  }
}
