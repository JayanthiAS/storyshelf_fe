import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublisherBookService } from '../../core/services/publisher.service';
import { PublisherBook } from '../../core/models/publisher.model';
import { GuruCardComponent, SpinnerComponent, EmptyStateComponent } from '../../shared/layout/layout.components';
import { ToastService } from '../../shared/services/toast.service';
import { bookStatusLabel } from './publisher-books.components';

@Component({
  selector: 'app-admin-publisher-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, GuruCardComponent, SpinnerComponent, EmptyStateComponent],
  template: `
    <h2 class="mb-2">Publisher reviews</h2>
    <p class="text-muted">Approve a book to place it on the reader shelf. A note is required to send it back or reject it.</p>
    @if (loading()) { <app-spinner /> } @else if (!books().length) {
      <app-empty-state message="Nothing is waiting for review." />
    } @else {
      <app-guru-card title="Queue">
        <table class="table mb-0">
          <thead><tr><th>Book</th><th>House</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (book of books(); track book._id) {
              <tr>
                <td>
                  <div>{{ book.title }}</div>
                  <div class="text-muted small">{{ authorName(book) }} · {{ book.language || 'no language' }}</div>
                  @if (book.reviewNote) { <div class="small">Last note: {{ book.reviewNote }}</div> }
                </td>
                <td>{{ houseName(book) }}</td>
                <td>{{ label(book) }}</td>
                <td style="min-width: 240px">
                  @if (book.submissionStatus === 'submitted') {
                    <button class="btn btn-sm btn-success me-1" (click)="approve(book)">Approve</button>
                  }
                  @if (book.takedownRequestedAt && book.status === 'published' && !book.takenDownAt) {
                    <button class="btn btn-sm btn-warning mb-2" (click)="takedown(book)">Confirm takedown</button>
                  }
                  @if (book.submissionStatus === 'submitted' || book.submissionStatus === 'changes_requested') {
                    <textarea class="form-control form-control-sm mb-1" rows="2" placeholder="Note for the house" [ngModel]="notes()[book._id] || ''" (ngModelChange)="setNote(book._id, $event)"></textarea>
                    <button class="btn btn-sm btn-outline-primary me-1" (click)="changes(book)">Request changes</button>
                    <button class="btn btn-sm btn-outline-danger" (click)="reject(book)">Reject</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </app-guru-card>
    }
  `,
})
export class AdminPublisherReviewsComponent implements OnInit {
  private booksApi = inject(PublisherBookService);
  private toast = inject(ToastService);
  loading = signal(true);
  books = signal<PublisherBook[]>([]);
  notes = signal<Record<string, string>>({});
  label = bookStatusLabel;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.booksApi.reviews().subscribe({
      next: (books) => {
        this.books.set(books);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setNote(id: string, note: string): void {
    this.notes.update((notes) => ({ ...notes, [id]: note }));
  }

  approve(book: PublisherBook): void {
    this.booksApi.approve(book._id).subscribe({
      next: () => {
        this.toast.success(`${book.title} is approved`);
        this.load();
      },
    });
  }

  changes(book: PublisherBook): void {
    const note = (this.notes()[book._id] || '').trim();
    if (note.length < 3) {
      this.toast.error('Add a note of at least 3 characters.');
      return;
    }
    this.booksApi.requestChanges(book._id, note).subscribe({
      next: () => {
        this.toast.success('Sent back to the house');
        this.load();
      },
    });
  }

  reject(book: PublisherBook): void {
    const note = (this.notes()[book._id] || '').trim();
    if (note.length < 3) {
      this.toast.error('Add a note of at least 3 characters.');
      return;
    }
    this.booksApi.reject(book._id, note).subscribe({
      next: () => {
        this.toast.success(`${book.title} was rejected`);
        this.load();
      },
    });
  }

  takedown(book: PublisherBook): void {
    this.booksApi.confirmTakedown(book._id).subscribe({
      next: () => {
        this.toast.success(`${book.title} was taken down`);
        this.load();
      },
    });
  }

  authorName(book: PublisherBook): string {
    return typeof book.authorId === 'string' ? 'Author' : book.authorId?.name || 'Author';
  }

  houseName(book: PublisherBook): string {
    if (!book.organizationId || typeof book.organizationId === 'string') return 'House';
    return book.organizationId.displayName || 'House';
  }
}
