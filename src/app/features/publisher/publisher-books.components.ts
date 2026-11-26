import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { GenreService } from '../../core/services/catalog.service';
import { PublisherBookService, PublisherService } from '../../core/services/publisher.service';
import { Genre } from '../../core/models/book.model';
import { PublisherAuthor, PublisherBook } from '../../core/models/publisher.model';
import { GuruCardComponent, SpinnerComponent, EmptyStateComponent } from '../../shared/layout/layout.components';
import { ToastService } from '../../shared/services/toast.service';
import { BOOK_FILE_TYPES, IMAGE_FILE_TYPES, formatBytes, validateUploadFile } from '../../core/utils/helpers';

function refId(value: string | { _id: string } | null | undefined): string {
  if (!value) return '';
  return typeof value === 'string' ? value : value._id;
}

export function bookStatusLabel(book: PublisherBook): string {
  if (book.takenDownAt) return 'Taken down';
  if (book.takedownRequestedAt && book.status === 'published') return 'Takedown requested';
  if (book.status === 'published' && book.releaseDate && new Date(book.releaseDate) > new Date()) return 'Scheduled';
  if (book.status === 'published') return 'Live for readers';
  if (book.submissionStatus === 'submitted') return 'In review';
  if (book.submissionStatus === 'changes_requested') return 'Changes requested';
  if (book.submissionStatus === 'rejected') return 'Rejected';
  return 'Draft';
}

function canEditBook(book: PublisherBook): boolean {
  return !book.takenDownAt && (book.submissionStatus === 'draft' || book.submissionStatus === 'changes_requested');
}

@Component({
  selector: 'app-publisher-books',
  standalone: true,
  imports: [CommonModule, RouterLink, GuruCardComponent, SpinnerComponent, EmptyStateComponent],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="mb-0">Books</h2>
      <a routerLink="/publisher/books/new" class="btn btn-primary">New book</a>
    </div>
    <p class="text-muted">Readers cannot see a book until Storyshelf approves it. This phase does not charge the house.</p>
    @if (loading()) { <app-spinner /> } @else if (!books().length) {
      <app-empty-state message="No books yet. Start a draft with a title and author." />
    } @else {
      <app-guru-card title="Your catalog">
        <table class="table mb-0">
          <thead><tr><th>Title</th><th>Status</th><th>File</th></tr></thead>
          <tbody>
            @for (book of books(); track book._id) {
              <tr>
                <td><a [routerLink]="['/publisher/books', book._id]">{{ book.title }}</a></td>
                <td>{{ label(book) }}</td>
                <td>{{ book.fileSizeBytes ? formatBytes(book.fileSizeBytes) : 'No file' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </app-guru-card>
    }
  `,
})
export class PublisherBooksComponent implements OnInit {
  private booksApi = inject(PublisherBookService);
  loading = signal(true);
  books = signal<PublisherBook[]>([]);
  label = bookStatusLabel;
  formatBytes = formatBytes;

  ngOnInit(): void {
    this.booksApi.list().subscribe({
      next: (books) => {
        this.books.set(books);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

@Component({
  selector: 'app-publisher-book-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, GuruCardComponent, SpinnerComponent],
  template: `
    <a routerLink="/publisher/books" class="small">Back to books</a>
    @if (loading()) { <app-spinner /> } @else {
      <h2 class="mt-2">{{ book() ? book()!.title : 'New book' }}</h2>
      @if (book()) {
        <p class="text-muted">{{ label(book()!) }}. Readers cannot see this until it is approved and the release date has arrived.</p>
      }
      @if (book()?.reviewNote) {
        <div class="alert alert-info"><strong>Reviewer note.</strong> {{ book()!.reviewNote }}</div>
      }
      @if (book()?.takenDownAt) {
        <div class="alert alert-warning">This book was taken down. The file is kept, and readers can no longer open it.</div>
      }
      @if (suspended()) {
        <div class="alert alert-warning">This house is suspended. Changes are paused.</div>
      }
      <app-guru-card title="Book details">
        <form [formGroup]="form" (ngSubmit)="save(false)">
          <div class="mb-3">
            <label class="form-label">Title</label>
            <input class="form-control" formControlName="title" />
          </div>
          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label">Existing house author</label>
              <select class="form-select" formControlName="authorId">
                <option value="">Create a new author instead</option>
                @for (author of authors(); track author._id) {
                  <option [value]="author._id">{{ author.name }}</option>
                }
              </select>
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">New author name</label>
              <input class="form-control" formControlName="authorName" [attr.disabled]="form.controls.authorId.value ? '' : null" />
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label">Genres</label>
            <div class="d-flex flex-wrap gap-2">
              @for (genre of genres(); track genre._id) {
                <label class="form-check">
                  <input class="form-check-input" type="checkbox" [checked]="selectedGenres().includes(genre._id)" (change)="toggleGenre(genre._id)" />
                  {{ genre.name }}
                </label>
              }
            </div>
          </div>
          <div class="row">
            <div class="col-md-4 mb-3">
              <label class="form-label">Language</label>
              <input class="form-control" formControlName="language" placeholder="en" />
            </div>
            <div class="col-md-4 mb-3">
              <label class="form-label">Imprint</label>
              <input class="form-control" formControlName="imprint" placeholder="Penguin Classics" />
            </div>
            <div class="col-md-4 mb-3">
              <label class="form-label">ISBN</label>
              <input class="form-control" formControlName="isbn" />
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label">Description</label>
            <textarea class="form-control" rows="4" formControlName="description"></textarea>
          </div>
          <div class="mb-3">
            <label class="form-label">Release date</label>
            <input type="date" class="form-control" formControlName="releaseDate" />
            <div class="form-text">Leave empty to go live as soon as Storyshelf approves it.</div>
          </div>
          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label">Cover</label>
              <input type="file" class="form-control" accept="image/jpeg,image/png,image/webp" (change)="onCover($event)" [disabled]="locked()" />
              @if (book()?.coverImageUrl) { <div class="form-text">A cover is already attached.</div> }
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">Book file</label>
              <input type="file" class="form-control" accept=".pdf,.epub,application/pdf,application/epub+zip" (change)="onFile($event)" [disabled]="locked()" />
              @if (book()?.fileSizeBytes) { <div class="form-text">{{ formatBytes(book()!.fileSizeBytes!) }} attached.</div> }
            </div>
          </div>
          @if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
          @if (!locked()) {
            <button class="btn btn-outline-primary me-2" type="submit" [disabled]="saving()">Save draft</button>
            <button class="btn btn-primary" type="button" [disabled]="saving()" (click)="save(true)">Submit for review</button>
          }
          @if (book()?.submissionStatus === 'submitted') {
            <button class="btn btn-outline-secondary" type="button" [disabled]="saving()" (click)="withdraw()">Withdraw</button>
          }
          @if (book()?.status === 'published' && !book()?.takenDownAt && isOwner()) {
            <button class="btn btn-outline-warning" type="button" [disabled]="saving()" (click)="takedown()">Request takedown</button>
          }
        </form>
      </app-guru-card>
    }
  `,
})
export class PublisherBookFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private booksApi = inject(PublisherBookService);
  private publishers = inject(PublisherService);
  private genresApi = inject(GenreService);
  private toast = inject(ToastService);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  book = signal<PublisherBook | null>(null);
  authors = signal<PublisherAuthor[]>([]);
  genres = signal<Genre[]>([]);
  selectedGenres = signal<string[]>([]);
  suspended = signal(false);
  isOwner = signal(false);
  private coverFile: File | null = null;
  private bookFile: File | null = null;
  label = bookStatusLabel;
  formatBytes = formatBytes;
  form = this.fb.group({
    title: ['', Validators.required],
    authorId: [''],
    authorName: [''],
    language: [''],
    imprint: [''],
    isbn: [''],
    description: [''],
    releaseDate: [''],
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    forkJoin({
      authors: this.booksApi.authors(),
      genres: this.genresApi.list({ limit: 100 }),
      session: this.publishers.me(),
      book: id ? this.booksApi.get(id) : of(null),
    }).subscribe({
      next: ({ authors, genres, session, book }) => {
        this.authors.set(authors);
        this.genres.set(genres.items);
        this.suspended.set(session.organization?.status === 'suspended');
        this.isOwner.set(session.membership?.orgRole === 'owner');
        if (book) this.applyBook(book);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  locked(): boolean {
    const book = this.book();
    return this.suspended() || (!!book && !canEditBook(book));
  }

  toggleGenre(id: string): void {
    if (this.locked()) return;
    this.selectedGenres.update((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  }

  onCover(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    const message = file ? validateUploadFile(file, IMAGE_FILE_TYPES) : null;
    this.error.set(message || '');
    this.coverFile = message ? null : file;
  }

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    const message = file ? validateUploadFile(file, BOOK_FILE_TYPES) : null;
    this.error.set(message || '');
    this.bookFile = message ? null : file;
  }

  save(submitAfter: boolean): void {
    if (this.form.invalid || this.locked()) return;
    this.saving.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    const body: Record<string, unknown> = {
      title: value.title!.trim(),
      description: value.description?.trim() || '',
      language: value.language?.trim() || '',
      imprint: value.imprint?.trim() || '',
      isbn: value.isbn?.trim() || '',
      genreIds: this.selectedGenres(),
    };
    if (value.authorId) body['authorId'] = value.authorId;
    else if (value.authorName?.trim()) body['authorName'] = value.authorName.trim();
    const current = this.book();
    if (current) {
      body['version'] = current.version;
      body['releaseDate'] = value.releaseDate ? new Date(value.releaseDate).toISOString() : null;
    } else if (value.releaseDate) {
      body['releaseDate'] = new Date(value.releaseDate).toISOString();
    }
    const request = current ? this.booksApi.update(current._id, body) : this.booksApi.create(body);
    request.pipe(
      switchMap((book) => this.coverFile ? this.booksApi.uploadCover(book._id, this.coverFile) : of(book)),
      switchMap((book) => this.bookFile ? this.booksApi.uploadFile(book._id, this.bookFile) : of(book)),
      switchMap((book) => submitAfter ? this.booksApi.submit(book._id) : of(book)),
    ).subscribe({
      next: (book) => {
        this.coverFile = null;
        this.bookFile = null;
        this.applyBook(book);
        this.saving.set(false);
        this.toast.success(submitAfter ? 'Submitted for review' : 'Draft saved');
        if (!current) this.router.navigate(['/publisher/books', book._id]);
      },
      error: (e) => {
        this.error.set(e.error?.message || 'Could not save this book');
        this.saving.set(false);
      },
    });
  }

  withdraw(): void {
    const book = this.book();
    if (!book) return;
    this.saving.set(true);
    this.booksApi.withdraw(book._id).subscribe({
      next: (updated) => {
        this.applyBook(updated);
        this.saving.set(false);
        this.toast.success('Withdrawn from review');
      },
      error: (e) => {
        this.error.set(e.error?.message || 'Could not withdraw this book');
        this.saving.set(false);
      },
    });
  }

  takedown(): void {
    const book = this.book();
    if (!book) return;
    this.saving.set(true);
    this.booksApi.requestTakedown(book._id).subscribe({
      next: (updated) => {
        this.applyBook(updated);
        this.saving.set(false);
        this.toast.success('Takedown requested');
      },
      error: (e) => {
        this.error.set(e.error?.message || 'Could not request takedown');
        this.saving.set(false);
      },
    });
  }

  private applyBook(book: PublisherBook): void {
    this.book.set(book);
    this.selectedGenres.set(book.genreIds.map((genre) => refId(genre)));
    this.form.patchValue({
      title: book.title,
      authorId: refId(book.authorId),
      authorName: '',
      language: book.language,
      imprint: book.imprint,
      isbn: book.isbn || '',
      description: book.description,
      releaseDate: book.releaseDate ? book.releaseDate.slice(0, 10) : '',
    });
    if (!canEditBook(book)) this.form.disable();
    else this.form.enable();
  }
}
