import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookService, GenreService } from '../../core/services/catalog.service';
import { BookCardComponent } from '../../shared/components/shared.components';
import { SpinnerComponent } from '../../shared/layout/layout.components';
import { Book } from '../../core/models/book.model';
import { Genre } from '../../core/models/book.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, BookCardComponent, SpinnerComponent],
  template: `
    <section class="mb-5">
      <div class="card bg-c-blue text-white p-5">
        <h1>Welcome to Storyshelf</h1>
        <p class="mb-3">Discover your next great read. Browse thousands of books from talented authors.</p>
        <a routerLink="/books" class="btn btn-light">Browse Books</a>
      </div>
    </section>

    @if (loading()) { <app-spinner /> } @else {
      <section class="mb-5">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h4>Featured</h4>
          <a routerLink="/books" class="btn btn-link">View all</a>
        </div>
        <div class="row g-3">
          @for (book of featured(); track book._id) {
            <div class="col-6 col-md-3 col-lg-2"><app-book-card [book]="book" /></div>
          } @empty { <p class="text-muted">No featured books yet.</p> }
        </div>
      </section>

      <section class="mb-5">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h4>New Releases</h4>
        </div>
        <div class="row g-3">
          @for (book of newReleases(); track book._id) {
            <div class="col-6 col-md-3 col-lg-2"><app-book-card [book]="book" /></div>
          } @empty { <p class="text-muted">No new releases.</p> }
        </div>
      </section>

      <section class="mb-5">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h4>Recently Added</h4>
        </div>
        <div class="row g-3">
          @for (book of recentlyAdded(); track book._id) {
            <div class="col-6 col-md-3 col-lg-2"><app-book-card [book]="book" /></div>
          } @empty { <p class="text-muted">No recent books.</p> }
        </div>
      </section>

      <section>
        <h4 class="mb-3">Browse by Genre</h4>
        <div class="row g-3">
          @for (genre of genres(); track genre._id) {
            <div class="col-md-4 col-lg-3">
              <a [routerLink]="['/genres', genre._id]" class="card text-decoration-none p-3 text-dark">
                <h6 class="mb-0">{{ genre.name }}</h6>
                <small class="text-muted">{{ genre.description || 'Explore books' }}</small>
              </a>
            </div>
          }
        </div>
      </section>
    }
  `,
})
export class HomeComponent implements OnInit {
  private bookService = inject(BookService);
  private genreService = inject(GenreService);
  loading = signal(true);
  featured = signal<Book[]>([]);
  recentlyAdded = signal<Book[]>([]);
  newReleases = signal<Book[]>([]);
  genres = signal<Genre[]>([]);

  ngOnInit(): void {
    this.bookService.featured({ limit: 6 }).subscribe((r) => this.featured.set(r.items));
    this.bookService.recentlyAdded({ limit: 6 }).subscribe((r) => this.recentlyAdded.set(r.items));
    this.bookService.list({ limit: 6, sort: '-releaseDate' }).subscribe((r) => this.newReleases.set(r.items));
    this.genreService.list({ limit: 8 }).subscribe((r) => { this.genres.set(r.items); this.loading.set(false); });
  }
}

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="text-center py-5">
      <img src="assets/images/error/error-1.jpg" alt="404" class="img-fluid mb-4" style="max-height: 200px" />
      <h2>Page Not Found</h2>
      <p class="text-muted">The page you're looking for doesn't exist.</p>
      <a routerLink="/" class="btn btn-primary">Go Home</a>
    </div>
  `,
})
export class NotFoundComponent {}

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="text-center py-5">
      <img src="assets/images/error/error-3.jpg" alt="403" class="img-fluid mb-4" style="max-height: 200px" />
      <h2>Access Denied</h2>
      <p class="text-muted">{{ message }}</p>
      <a routerLink="/pricing" class="btn btn-primary me-2">View Plans</a>
      <a routerLink="/" class="btn btn-outline-secondary">Go Home</a>
    </div>
  `,
})
export class ForbiddenComponent {
  message = 'You need a subscription to access this content.';
}
