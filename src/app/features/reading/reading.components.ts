import { Component, computed, inject, OnInit, OnDestroy, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { BookService } from '../../core/services/catalog.service';
import { ReadingService } from '../../core/services/domain.service';
import { GuruCardComponent, SpinnerComponent, EmptyStateComponent } from '../../shared/layout/layout.components';
import { BookCardComponent } from '../../shared/components/shared.components';
import { Book } from '../../core/models/book.model';
import { ReadingProgress } from '../../core/models/notification.model';
import { getEntityId, resolveUploadUrl } from '../../core/utils/helpers';
import { AuthService } from '../../core/auth/auth.service';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdfjs/pdf.worker.min.mjs';

function isPdfBytes(buffer: ArrayBuffer): boolean {
  const header = new TextDecoder().decode(buffer.slice(0, 5));
  return header.startsWith('%PDF');
}

@Component({
  selector: 'app-reading-list',
  standalone: true,
  imports: [CommonModule, RouterLink, BookCardComponent, SpinnerComponent, EmptyStateComponent, GuruCardComponent],
  template: `
    <h2 class="mb-4">Continue Reading</h2>
    @if (loading()) { <app-spinner /> } @else {
      @if (!inProgress().length) {
        <app-empty-state message="No books in progress" actionLabel="Browse Books" (action)="router.navigate(['/books'])" />
      } @else {
        <div class="row g-3">
          @for (p of inProgress(); track getBookId(p)) {
            <div class="col-md-4">
              <app-guru-card>
                <h6>{{ getBookTitle(p) }}</h6>
                <div class="progress mb-2"><div class="progress-bar" [style.width.%]="p.percentComplete"></div></div>
                <small class="text-muted">Page {{ p.currentPage }} / {{ p.totalPages }}</small>
                <a [routerLink]="['/books', getBookId(p), 'read']" class="btn btn-primary btn-sm mt-2">Continue</a>
              </app-guru-card>
            </div>
          }
        </div>
      }

      @if (completed().length) {
        <h2 class="mt-5 mb-4">Completed</h2>
        <div class="row g-3">
          @for (p of completed(); track getBookId(p)) {
            <div class="col-md-4">
              <app-guru-card>
                <h6>{{ getBookTitle(p) }}</h6>
                <div class="progress mb-2"><div class="progress-bar bg-success" style="width: 100%"></div></div>
                <small class="text-muted">
                  Finished{{ p.completedAt ? ' on ' + (p.completedAt | date:'mediumDate') : '' }}
                </small>
                <a [routerLink]="['/books', getBookId(p), 'read']" class="btn btn-outline-primary btn-sm mt-2">Read again</a>
              </app-guru-card>
            </div>
          }
        </div>
      }
    }
  `,
})
export class ReadingListComponent implements OnInit {
  private readingService = inject(ReadingService);
  router = inject(Router);
  loading = signal(true);
  progress = signal<ReadingProgress[]>([]);
  inProgress = computed(() => this.progress().filter((p) => !this.isCompleted(p)));
  completed = computed(() => this.progress().filter((p) => this.isCompleted(p)));

  ngOnInit(): void {
    this.readingService.getProgress().subscribe((r) => { this.progress.set(r); this.loading.set(false); });
  }

  private isCompleted(p: ReadingProgress): boolean {
    return !!p.isCompleted || (p.totalPages > 0 && p.currentPage >= p.totalPages);
  }

  getBookTitle(p: ReadingProgress): string {
    const b = p.bookId;
    return typeof b === 'object' ? b.title : 'Book';
  }

  getBookId(p: ReadingProgress): string {
    return getEntityId(p.bookId);
  }
}

@Component({
  selector: 'app-reading-history',
  standalone: true,
  imports: [CommonModule, BookCardComponent, SpinnerComponent, EmptyStateComponent],
  template: `
    <h2 class="mb-4">Reading History</h2>
    @if (loading()) { <app-spinner /> } @else if (!books().length) { <app-empty-state message="No reading history" /> }
    @else { <div class="row g-3">@for (b of books(); track b._id) { <div class="col-md-3"><app-book-card [book]="b" /></div> }</div> }
  `,
})
export class ReadingHistoryComponent implements OnInit {
  private readingService = inject(ReadingService);
  loading = signal(true);
  books = signal<Book[]>([]);
  ngOnInit(): void { this.readingService.getHistory().subscribe((r) => { this.books.set(r.items); this.loading.set(false); }); }
}

@Component({
  selector: 'app-book-reader',
  standalone: true,
  imports: [CommonModule, RouterLink, SpinnerComponent],
  template: `
    <div class="reader-fullscreen d-flex flex-column">
      <div class="d-flex justify-content-between align-items-center p-2 border-bottom bg-light">
        <button class="btn btn-sm btn-outline-secondary" (click)="close()">← Back</button>
        <span>{{ bookTitle() }}</span>
        <span class="text-muted small">Page {{ currentPage() }} / {{ totalPages() }}</span>
      </div>
      @if (loading()) { <app-spinner /> }
      @else if (error()) {
        <div class="text-center p-5">
          <i class="icofont icofont-lock display-4 text-c-pink mb-3"></i>
          <h4>{{ error() }}</h4>
          <div class="d-flex gap-2 justify-content-center mt-3">
            @if (showUpgrade()) {
              <a routerLink="/pricing" class="btn btn-primary">Subscribe to Unlock</a>
            } @else if (showLogin()) {
              <a routerLink="/login" class="btn btn-primary">Sign In</a>
              <a routerLink="/register" class="btn btn-outline-secondary">Register</a>
            }
            <button class="btn btn-outline-secondary" (click)="close()">Back to Book</button>
          </div>
        </div>
      }
      @else if (isPdf) {
        <div class="flex-grow-1 overflow-auto p-3 text-center" #pdfContainer></div>
        <div class="p-2 border-top d-flex justify-content-center gap-2">
          <button class="btn btn-sm btn-outline-primary" (click)="prevPage()" [disabled]="currentPage() <= 1">Prev</button>
          <button class="btn btn-sm btn-outline-primary" (click)="nextPage()" [disabled]="currentPage() >= totalPages()">Next</button>
        </div>
      }
      @else {
        <div class="flex-grow-1 overflow-auto p-4" #epubContainer></div>
      }
    </div>
  `,
})
export class BookReaderComponent implements OnInit, OnDestroy {
  @ViewChild('pdfContainer') pdfContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('epubContainer') epubContainer!: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bookService = inject(BookService);
  private readingService = inject(ReadingService);
  private auth = inject(AuthService);

  loading = signal(true);
  error = signal('');
  showUpgrade = signal(false);
  showLogin = signal(false);
  bookTitle = signal('');
  currentPage = signal(1);
  totalPages = signal(1);
  isPdf = true;
  private bookId = '';
  private fileMimeType = '';
  private fileUrl = '';
  private sessionStart = Date.now();
  private sessionId: string | null = null;
  private sessionReady?: Promise<string | null>;
  private sessionTimer?: ReturnType<typeof setInterval>;
  private pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
  private saveTimer?: ReturnType<typeof setTimeout>;
  private readonly onPageHide = () => this.checkpointSession();

  ngOnInit(): void {
    this.bookId = this.route.snapshot.paramMap.get('id')!;
    this.bookService.getById(this.bookId).subscribe({
      next: (b) => {
        this.bookTitle.set(b.title);
        this.fileMimeType = b.fileMimeType ?? '';
        this.fileUrl = b.fileUrl ?? '';
        this.isPdf = !this.fileMimeType.includes('epub');

        if (b.isLocked && !b.fileUrl) {
          this.blockLockedAccess();
          return;
        }
        if (!b.fileUrl) {
          this.error.set('Book file not yet uploaded.');
          this.loading.set(false);
          return;
        }

        this.readingService.getBookProgress(this.bookId).subscribe({
          next: (p) => {
            if (p.isCompleted || !p.currentPage) return;
            this.currentPage.set(p.currentPage);
            if (this.pdfDoc && this.pdfContainer) this.renderPdfPage(this.clampPage(p.currentPage));
          },
          error: () => {},
        });
        this.loadContent();
      },
      error: () => {
        this.error.set('Unable to load book.');
        this.loading.set(false);
      },
    });
  }

  private blockLockedAccess(): void {
    if (!this.auth.isAuthenticated()) {
      this.error.set('Sign in and subscribe to read this premium book.');
      this.showLogin.set(true);
    } else {
      this.error.set('Subscribe to unlock and read this premium book.');
      this.showUpgrade.set(true);
    }
    this.loading.set(false);
  }

  ngOnDestroy(): void {
    clearInterval(this.sessionTimer);
    window.removeEventListener('pagehide', this.onPageHide);
    this.saveProgress();
    this.checkpointSession();
  }

  private beginSession(): void {
    if (!this.auth.isAuthenticated() || this.sessionReady) return;
    this.sessionStart = Date.now();
    const startedAt = new Date(this.sessionStart).toISOString();
    this.sessionReady = new Promise((resolve) => {
      this.readingService.logSession({
        bookId: this.bookId,
        durationSeconds: 0,
        startedAt,
        endedAt: startedAt,
      }).subscribe({
        next: (session) => {
          this.sessionId = session._id;
          resolve(session._id);
        },
        error: () => resolve(null),
      });
    });
    this.sessionTimer = setInterval(() => this.checkpointSession(), 60_000);
    window.addEventListener('pagehide', this.onPageHide);
  }

  private checkpointSession(): void {
    if (!this.sessionReady || !this.bookId) return;
    const durationSeconds = Math.floor((Date.now() - this.sessionStart) / 1000);
    const endedAt = new Date().toISOString();
    void this.sessionReady.then((id) => {
      if (!id) return;
      this.readingService.updateSession(id, { durationSeconds, endedAt }).subscribe();
    });
  }

  private loadContent(): void {
    this.bookService.getContent(this.bookId).subscribe({
      next: async (blob) => {
        try {
          const bytes = await this.resolveContentBytes(blob);
          if (this.isPdf) {
            await this.renderPdf(bytes);
          } else {
            await this.renderEpub(bytes);
          }
          this.loading.set(false);
          this.beginSession();
        } catch (err) {
          this.error.set(err instanceof Error ? err.message : 'Unable to open this book.');
          this.loading.set(false);
        }
      },
      error: (e: HttpErrorResponse) => {
        const code = e.error?.code;
        if (code === 'BOOK_LOCKED') {
          this.error.set('Sign in and subscribe to read this premium book.');
          this.showLogin.set(true);
        } else if (code === 'SUBSCRIPTION_REQUIRED') {
          this.error.set('Subscribe to unlock and read this premium book.');
          this.showUpgrade.set(true);
        } else if (code === 'BOOK_NOT_RELEASED') {
          this.error.set('This book is not yet released.');
        } else {
          this.error.set('Unable to load book content.');
        }
        this.loading.set(false);
      },
    });
  }

  /** Ensure we have raw PDF/EPUB bytes (handles legacy JSON-wrapped API responses). */
  private async resolveContentBytes(blob: Blob): Promise<ArrayBuffer> {
    let buffer = await blob.arrayBuffer();

    if (isPdfBytes(buffer) || this.fileMimeType.includes('epub')) {
      return buffer;
    }

    // Legacy: API wrapped binary in JSON envelope { success, data: ... }
    const text = new TextDecoder().decode(buffer.slice(0, 200));
    if (text.trimStart().startsWith('{')) {
      try {
        const json = JSON.parse(new TextDecoder().decode(buffer));
        if (json?.message) throw new Error(json.message);
      } catch {
        /* not JSON — fall through */
      }
    }

    // Fallback: fetch directly from static uploads path
    if (this.fileUrl) {
      const resp = await fetch(resolveUploadUrl(this.fileUrl));
      if (!resp.ok) throw new Error('Book file could not be loaded.');
      buffer = await resp.arrayBuffer();
      if (isPdfBytes(buffer) || this.fileMimeType.includes('epub')) {
        return buffer;
      }
    }

    throw new Error('Invalid PDF structure. The book file may be corrupt or was uploaded incorrectly.');
  }

  private async renderPdf(buffer: ArrayBuffer): Promise<void> {
    this.pdfDoc = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
    this.totalPages.set(this.pdfDoc.numPages);
    setTimeout(() => this.renderPdfPage(this.clampPage(this.currentPage())), 50);
  }

  private clampPage(page: number): number {
    return Math.min(Math.max(page, 1), this.pdfDoc?.numPages ?? 1);
  }

  private async renderPdfPage(pageNum: number): Promise<void> {
    if (!this.pdfDoc || !this.pdfContainer) return;
    const page = await this.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    this.pdfContainer.nativeElement.innerHTML = '';
    this.pdfContainer.nativeElement.appendChild(canvas);
    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
    this.currentPage.set(pageNum);
    this.scheduleSave();
  }

  private async renderEpub(buffer: ArrayBuffer): Promise<void> {
    const ePub = (await import('epubjs')).default;
    const book = ePub(buffer);
    const rendition = book.renderTo(this.epubContainer.nativeElement, { width: '100%', height: '100%' });
    await rendition.display();
  }

  prevPage(): void { if (this.currentPage() > 1) this.renderPdfPage(this.currentPage() - 1); }
  nextPage(): void { if (this.currentPage() < this.totalPages()) this.renderPdfPage(this.currentPage() + 1); }

  private scheduleSave(): void {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveProgress(), 2000);
  }

  private saveProgress(): void {
    if (!this.bookId || this.error()) return;
    if (this.isPdf) {
      if (!this.pdfDoc) return;
      this.readingService.saveProgress(this.bookId, {
        currentPage: this.currentPage(),
        totalPages: this.pdfDoc.numPages,
      }).subscribe();
      return;
    }
    this.readingService.saveProgress(this.bookId, { currentPage: 0, totalPages: 0 }).subscribe();
  }

  close(): void {
    this.router.navigate(['/books', this.bookId]);
  }
}
