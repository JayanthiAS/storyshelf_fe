import { Component, Input, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { resolveUploadUrl, formatDate, isFutureDate, getAuthorName, validateUploadFile } from '../../core/utils/helpers';
import { Book } from '../../core/models/book.model';
import { AuthService } from '../../core/auth/auth.service';
import { SubscriptionPlan } from '../../core/models/subscription-plan.model';
import { SearchService, SearchSuggestion } from '../../core/services/domain.service';

@Component({
  selector: 'app-book-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="card h-100">
      <div class="position-relative">
        <a [routerLink]="['/books', book._id]">
          <img [src]="coverUrl" [alt]="book.title" class="book-cover" onerror="this.src='assets/images/logo.png'" />
        </a>
        @if (book.isLocked) {
          <div class="lock-overlay"><i class="icofont icofont-lock"></i></div>
        }
        @if (isComingSoon) {
          <span class="badge bg-warning position-absolute top-0 start-0 m-2">Coming {{ formatDate(book.releaseDate) }}</span>
        }
      </div>
      <div class="card-body">
        <h6 class="card-title mb-1">
          <a [routerLink]="['/books', book._id]" class="text-decoration-none text-dark">{{ book.title }}</a>
        </h6>
        <small class="text-muted">{{ getAuthorName(book.authorId) }}</small>
      </div>
    </div>
  `,
})
export class BookCardComponent {
  @Input({ required: true }) book!: Book;
  auth = inject(AuthService);
  formatDate = formatDate;
  getAuthorName = getAuthorName;

  get coverUrl(): string {
    return resolveUploadUrl(this.book.coverImageUrl) || 'assets/images/logo.png';
  }

  get isComingSoon(): boolean {
    return isFutureDate(this.book.releaseDate);
  }
}

@Component({
  selector: 'app-plan-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card h-100" [class.border-primary]="isCurrent">
      <div class="card-body text-center">
        <h5>{{ plan.name }}</h5>
        <h2 class="text-c-blue">
          @if (plan.price === 0) { Free } @else { {{ plan.price | currency:(plan.currency | uppercase) }} / {{ plan.interval }} }
        </h2>
        <p class="text-muted">{{ plan.description }}</p>
        <ul class="list-unstyled text-start mb-4">
          @for (f of plan.features; track f) {
            <li><i class="icofont icofont-check-circled text-c-green"></i> {{ f }}</li>
          }
        </ul>
        <button class="btn btn-primary w-100" [disabled]="disabled" (click)="select.emit(plan)">{{ ctaLabel }}</button>
      </div>
    </div>
  `,
})
export class PlanCardComponent {
  @Input({ required: true }) plan!: SubscriptionPlan;
  @Input() isCurrent = false;
  @Input() ctaLabel = 'Choose Plan';
  @Input() disabled = false;
  select = output<SubscriptionPlan>();
}

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="position-relative">
      <input type="search" class="form-control" placeholder="Search books..." [(ngModel)]="query" (input)="onInput()" (keydown.enter)="search()" />
      @if (suggestions.length) {
        <div class="list-group position-absolute w-100 shadow-sm" style="z-index: 100; top: 100%">
          @for (s of suggestions; track s.id) {
            <a href="#" class="list-group-item list-group-item-action" (click)="pick(s, $event)">{{ s.title }}</a>
          }
        </div>
      }
    </div>
  `,
})
export class SearchBarComponent {
  private searchService = inject(SearchService);
  private router = inject(Router);
  query = '';
  suggestions: SearchSuggestion[] = [];
  private debounce?: ReturnType<typeof setTimeout>;

  onInput(): void {
    clearTimeout(this.debounce);
    if (this.query.length < 2) { this.suggestions = []; return; }
    this.debounce = setTimeout(() => {
      this.searchService.suggest(this.query).subscribe((s) => (this.suggestions = s));
    }, 300);
  }

  search(): void {
    const q = this.query.trim();
    if (!q) return;
    this.clear();
    this.router.navigate(['/search'], { queryParams: { q } });
  }

  pick(suggestion: SearchSuggestion, event: Event): void {
    event.preventDefault();
    this.query = suggestion.title;
    this.clear();
    this.router.navigate(['/search'], { queryParams: { q: suggestion.title } });
  }

  clear(): void { this.suggestions = []; }
}

@Component({
  selector: 'app-file-upload',
  standalone: true,
  template: `
    <div class="border rounded p-3 text-center" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
      <input type="file" class="form-control" [accept]="accept" (change)="onSelect($event)" />
      @if (error) { <div class="text-danger small mt-2">{{ error }}</div> }
      @if (uploading) { <div class="spinner-border spinner-border-sm mt-2"></div> }
    </div>
  `,
})
export class FileUploadComponent {
  @Input() accept = '';
  @Input() allowedTypes: string[] = [];
  @Input() uploading = false;
  fileSelected = output<File>();
  error = '';

  onSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.validateAndEmit(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.validateAndEmit(file);
  }

  private validateAndEmit(file: File): void {
    const err = validateUploadFile(file, this.allowedTypes);
    if (err) { this.error = err; return; }
    this.error = '';
    this.fileSelected.emit(file);
  }
}
