import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { BookService } from '../../core/services/catalog.service';
import { UserService } from '../../core/services/domain.service';
import { AuthService } from '../../core/auth/auth.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { BookCardComponent } from '../../shared/components/shared.components';
import { GuruCardComponent, SpinnerComponent, PaginationComponent, BreadcrumbComponent, EmptyStateComponent } from '../../shared/layout/layout.components';
import { Book } from '../../core/models/book.model';
import { formatDate, getAuthorName, hasLockedBookAccess, isFutureDate, resolveUploadUrl } from '../../core/utils/helpers';
import { SearchService } from '../../core/services/domain.service';

@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, BookCardComponent, SpinnerComponent, PaginationComponent, EmptyStateComponent],
  template: `
    <h2 class="mb-4">Browse Books</h2>
    <form [formGroup]="filters" class="row g-2 mb-4">
      <div class="col-md-4"><input class="form-control" formControlName="search" placeholder="Search..." /></div>
      <div class="col-md-2">
        <select class="form-select" formControlName="isLocked">
          <option value="">All access</option>
          <option value="false">Free</option>
          <option value="true">Premium</option>
        </select>
      </div>
      <div class="col-md-2"><button type="button" class="btn btn-primary" (click)="load()">Filter</button></div>
    </form>
    @if (loading()) { <app-spinner /> } @else if (!books().length) {
      <app-empty-state message="No books match your filters" />
    } @else {
      <div class="row g-3">
        @for (book of books(); track book._id) {
          <div class="col-6 col-md-4 col-lg-3"><app-book-card [book]="book" /></div>
        }
      </div>
      <app-pagination [page]="page()" [totalPages]="totalPages()" (pageChange)="onPage($event)" />
    }
  `,
})
export class BookListComponent implements OnInit {
  private bookService = inject(BookService);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  loading = signal(true);
  books = signal<Book[]>([]);
  page = signal(1);
  totalPages = signal(1);
  filters = this.fb.group({ search: [''], isLocked: [''] });

  ngOnInit(): void {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    if (sessionId) {
      this.router.navigate(['/subscription/success'], {
        queryParams: { session_id: sessionId },
      });
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const v = this.filters.getRawValue();
    this.bookService.list({ page: this.page(), limit: 12, search: v.search || undefined, isLocked: v.isLocked || undefined }).subscribe((r) => {
      this.books.set(r.items);
      this.totalPages.set(r.meta.totalPages);
      this.loading.set(false);
    });
  }

  onPage(p: number): void { this.page.set(p); this.load(); }
}

@Component({
  selector: 'app-book-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, GuruCardComponent, SpinnerComponent, BreadcrumbComponent],
  template: `
    @if (loading()) { <app-spinner /> } @else if (book()) {
      <app-breadcrumb [items="[{ label: 'Books', link: '/books' }, { label: book()!.title }]" />
      <div class="row">
        <div class="col-md-4">
          <img [src]="coverUrl" class="book-cover shadow" onerror="this.src='assets/images/logo.png'" />
        </div>
        <div class="col-md-8">
          <h2>{{ book()!.title }}</h2>
          <p class="text-muted">by {{ getAuthorName(book()!.authorId) }}</p>
          <div class="mb-3">
            @if (book()!.isLocked) { <span class="badge bg-c-pink me-2">Premium</span> }
            @if (isComingSoon) { <span class="badge bg-warning me-2">Coming {{ formatDate(book()!.releaseDate) }}</span> }
            <span class="badge bg-secondary">{{ book()!.status }}</span>
          </div>
          <p>{{ book()!.description }}</p>
          @if (preview()) {
            <app-guru-card title="Preview">
              <p class="fst-italic">{{ preview() }}</p>
            </app-guru-card>
          }
          <div class="d-flex gap-2 mt-3 flex-wrap">
            @if (canRead()) {
              @if (!auth.isAuthenticated()) {
                <button type="button" class="btn btn-primary" (click)="readAsGuest()">Read Now</button>
              } @else {
                <a [routerLink]="['/books', book()!._id, 'read']" class="btn btn-primary">Read Now</a>
              }
            } @else if (needsSubscription()) {
              <div class="alert alert-warning w-100 mb-0">
                <i class="icofont icofont-lock"></i>
                This is a premium book. Subscribe to unlock and read it.
              </div>
              @if (!auth.isAuthenticated()) {
                <a routerLink="/login" class="btn btn-outline-primary">Sign In</a>
                <a routerLink="/register" class="btn btn-outline-secondary">Register</a>
              }
              <a routerLink="/pricing" class="btn btn-primary">View Plans</a>
            } @else if (accessError()) {
              <div class="alert alert-warning w-100 mb-0">{{ accessError() }}</div>
            }
            @if (auth.isAuthenticated() && !auth.isGuest() && !isComingSoon) {
              <button class="btn btn-outline-danger" (click)="toggleLike()">{{ liked() ? 'Unlike' : 'Like' }}</button>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class BookDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bookService = inject(BookService);
  private userService = inject(UserService);
  private subscriptionService = inject(SubscriptionService);
  auth = inject(AuthService);
  loading = signal(true);
  book = signal<Book | null>(null);
  preview = signal('');
  liked = signal(false);
  accessError = signal('');
  hasUnlock = signal(false);
  subscriptionChecked = signal(false);
  formatDate = formatDate;
  getAuthorName = getAuthorName;

  get coverUrl(): string {
    return resolveUploadUrl(this.book()?.coverImageUrl) || 'assets/images/logo.png';
  }

  get isComingSoon(): boolean {
    return isFutureDate(this.book()?.releaseDate);
  }

  canRead(): boolean {
    const b = this.book();
    return !!b && !this.isComingSoon && !this.accessError() && !this.needsSubscription() && !!b.fileUrl;
  }

  readAsGuest(): void {
    const id = this.book()?._id;
    if (!id) return;
    this.auth.loginAsGuest().subscribe({
      next: () => this.router.navigate(['/books', id, 'read']),
    });
  }

  needsSubscription(): boolean {
    const b = this.book();
    if (!b?.isLocked) return false;
    if (!this.auth.isAuthenticated() || this.auth.isGuest()) return true;
    return this.subscriptionChecked() && !this.hasUnlock();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.bookService.getById(id).subscribe({
      next: (b) => {
        this.book.set(b);
        this.loading.set(false);
        this.evaluateAccess(b);
      },
      error: () => this.loading.set(false),
    });
    this.bookService.getPreview(id).subscribe((p) => this.preview.set(p.shortStory || ''));
    if (this.auth.isAuthenticated() && !this.auth.isGuest()) {
      this.userService.getLikes().subscribe((r) => this.liked.set(r.items.some((x) => x._id === id)));
      this.subscriptionService.getMySubscription().subscribe({
        next: (sub) => {
          this.hasUnlock.set(hasLockedBookAccess(sub));
          this.subscriptionChecked.set(true);
          const b = this.book();
          if (b) this.evaluateAccess(b);
        },
        error: () => this.subscriptionChecked.set(true),
      });
    }
  }

  private evaluateAccess(b: Book): void {
    if (isFutureDate(b.releaseDate)) {
      this.accessError.set(`Available on ${formatDate(b.releaseDate)}`);
    } else if (!b.isLocked && !b.fileUrl) {
      this.accessError.set('Book file not yet uploaded.');
    } else if (b.isLocked && this.auth.isAuthenticated() && this.subscriptionChecked() && !this.hasUnlock()) {
      this.accessError.set('');
    } else {
      this.accessError.set('');
    }
  }

  toggleLike(): void {
    const id = this.book()!._id;
    const req = this.liked() ? this.userService.unlikeBook(id) : this.userService.likeBook(id);
    req.subscribe(() => this.liked.update((v) => !v));
  }
}

@Component({
  selector: 'app-book-preview',
  standalone: true,
  imports: [CommonModule, SpinnerComponent, BreadcrumbComponent],
  template: `
    @if (loading()) { <app-spinner /> } @else {
      <app-breadcrumb [items="[{ label: 'Books', link: '/books' }, { label: 'Preview' }]" />
      <div class="card p-4"><p class="lead">{{ text() }}</p></div>
    }
  `,
})
export class BookPreviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private bookService = inject(BookService);
  loading = signal(true);
  text = signal('');

  ngOnInit(): void {
    this.bookService.getPreview(this.route.snapshot.paramMap.get('id')!).subscribe((p) => {
      this.text.set(p.shortStory || 'No preview available.');
      this.loading.set(false);
    });
  }
}

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [CommonModule, BookCardComponent, SpinnerComponent, EmptyStateComponent, PaginationComponent],
  template: `
    <h2 class="mb-4">Search: "{{ query }}"</h2>
    @if (query.length < 2) { <p class="text-muted">Enter at least 2 characters to search.</p> }
    @else if (loading()) { <app-spinner /> }
    @else if (!books().length) { <app-empty-state message="No results found" /> }
    @else {
      <div class="row g-3">
        @for (book of books(); track book._id) { <div class="col-md-3"><app-book-card [book]="book" /></div> }
      </div>
      <app-pagination [page]="page()" [totalPages]="totalPages()" (pageChange)="onPage($event)" />
    }
  `,
})
export class SearchPageComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private searchService = inject(SearchService);
  loading = signal(false);
  books = signal<Book[]>([]);
  page = signal(1);
  totalPages = signal(1);
  query = '';

  ngOnInit(): void {
    this.route.queryParams.subscribe((p) => {
      const next = p['q'] || '';
      if (next !== this.query) this.page.set(1);
      this.query = next;
      if (this.query.length >= 2) this.search();
      else {
        this.books.set([]);
        this.loading.set(false);
      }
    });
  }

  search(): void {
    this.loading.set(true);
    this.searchService.searchBooks(this.query, { page: this.page(), limit: 12 }).subscribe({
      next: (r) => {
        this.books.set(r.items);
        this.totalPages.set(r.meta.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.books.set([]);
        this.loading.set(false);
      },
    });
  }

  onPage(p: number): void { this.page.set(p); this.search(); }
}
