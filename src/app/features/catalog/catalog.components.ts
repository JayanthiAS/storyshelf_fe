import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthorService, GenreService, SeriesService } from '../../core/services/catalog.service';
import { BookCardComponent } from '../../shared/components/shared.components';
import { SpinnerComponent, PaginationComponent, BreadcrumbComponent, EmptyStateComponent } from '../../shared/layout/layout.components';
import { Author, Genre, Series, Book } from '../../core/models/book.model';

@Component({
  selector: 'app-author-list',
  standalone: true,
  imports: [CommonModule, RouterLink, SpinnerComponent, EmptyStateComponent],
  template: `
    <h2 class="mb-4">Authors</h2>
    @if (loading()) { <app-spinner /> } @else {
      <div class="row g-3">
        @for (a of authors(); track a._id) {
          <div class="col-md-4">
            <a [routerLink]="['/authors', a._id]" class="card p-3 text-decoration-none text-dark">
              <h5>{{ a.name }}</h5>
              <p class="text-muted small mb-0">{{ a.bio || 'View books' }}</p>
            </a>
          </div>
        } @empty { <app-empty-state message="No authors yet" /> }
      </div>
    }
  `,
})
export class AuthorListComponent implements OnInit {
  private service = inject(AuthorService);
  loading = signal(true);
  authors = signal<Author[]>([]);
  ngOnInit(): void {
    this.service.list({ limit: 50 }).subscribe((r) => { this.authors.set(r.items); this.loading.set(false); });
  }
}

@Component({
  selector: 'app-author-detail',
  standalone: true,
  imports: [CommonModule, BookCardComponent, SpinnerComponent, BreadcrumbComponent, PaginationComponent],
  template: `
    @if (loading()) { <app-spinner /> } @else if (author()) {
      <app-breadcrumb [items="[{ label: 'Authors', link: '/authors' }, { label: author()!.name }]" />
      <h2>{{ author()!.name }}</h2>
      <p>{{ author()!.bio }}</p>
      <h4 class="mt-4">Books</h4>
      <div class="row g-3">
        @for (book of books(); track book._id) { <div class="col-md-3"><app-book-card [book]="book" /></div> }
      </div>
    }
  `,
})
export class AuthorDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(AuthorService);
  loading = signal(true);
  author = signal<Author | null>(null);
  books = signal<Book[]>([]);
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.service.getById(id).subscribe((a) => this.author.set(a));
    this.service.getBooks(id, { limit: 20 }).subscribe((r) => { this.books.set(r.items); this.loading.set(false); });
  }
}

@Component({
  selector: 'app-genre-list',
  standalone: true,
  imports: [CommonModule, RouterLink, SpinnerComponent],
  template: `
    <h2 class="mb-4">Genres</h2>
    @if (loading()) { <app-spinner /> } @else {
      <div class="row g-3">
        @for (g of genres(); track g._id) {
          <div class="col-md-4"><a [routerLink]="['/genres', g._id]" class="card p-3 text-decoration-none text-dark"><h5>{{ g.name }}</h5></a></div>
        }
      </div>
    }
  `,
})
export class GenreListComponent implements OnInit {
  private service = inject(GenreService);
  loading = signal(true);
  genres = signal<Genre[]>([]);
  ngOnInit(): void { this.service.list({ limit: 50 }).subscribe((r) => { this.genres.set(r.items); this.loading.set(false); }); }
}

@Component({
  selector: 'app-genre-detail',
  standalone: true,
  imports: [CommonModule, BookCardComponent, SpinnerComponent, BreadcrumbComponent],
  template: `
    @if (loading()) { <app-spinner /> } @else if (genre()) {
      <app-breadcrumb [items="[{ label: 'Genres', link: '/genres' }, { label: genre()!.name }]" />
      <h2>{{ genre()!.name }}</h2>
      <div class="row g-3 mt-2">
        @for (book of books(); track book._id) { <div class="col-md-3"><app-book-card [book]="book" /></div> }
      </div>
    }
  `,
})
export class GenreDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(GenreService);
  loading = signal(true);
  genre = signal<Genre | null>(null);
  books = signal<Book[]>([]);
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.service.getById(id).subscribe((g) => this.genre.set(g));
    this.service.getBooks(id).subscribe((r) => { this.books.set(r.items); this.loading.set(false); });
  }
}

@Component({
  selector: 'app-series-list',
  standalone: true,
  imports: [CommonModule, RouterLink, SpinnerComponent],
  template: `
    <h2 class="mb-4">Series</h2>
    @if (loading()) { <app-spinner /> } @else {
      <div class="row g-3">
        @for (s of series(); track s._id) {
          <div class="col-md-4"><a [routerLink]="['/series', s._id]" class="card p-3 text-decoration-none text-dark"><h5>{{ s.title }}</h5></a></div>
        }
      </div>
    }
  `,
})
export class SeriesListComponent implements OnInit {
  private service = inject(SeriesService);
  loading = signal(true);
  series = signal<Series[]>([]);
  ngOnInit(): void { this.service.list({ limit: 50 }).subscribe((r) => { this.series.set(r.items); this.loading.set(false); }); }
}

@Component({
  selector: 'app-series-detail',
  standalone: true,
  imports: [CommonModule, BookCardComponent, SpinnerComponent, BreadcrumbComponent],
  template: `
    @if (loading()) { <app-spinner /> } @else if (seriesItem()) {
      <app-breadcrumb [items="[{ label: 'Series', link: '/series' }, { label: seriesItem()!.title }]" />
      <h2>{{ seriesItem()!.title }}</h2>
      <p>{{ seriesItem()!.description }}</p>
      <div class="row g-3">
        @for (book of books(); track book._id) { <div class="col-md-3"><app-book-card [book]="book" /></div> }
      </div>
    }
  `,
})
export class SeriesDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(SeriesService);
  loading = signal(true);
  seriesItem = signal<Series | null>(null);
  books = signal<Book[]>([]);
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.service.getById(id).subscribe((s) => this.seriesItem.set(s));
    this.service.getBooks(id).subscribe((r) => { this.books.set(r.items); this.loading.set(false); });
  }
}
