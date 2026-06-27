import { Component, Input, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-guru-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card" [ngClass]="cardClass">
      @if (title) {
        <div class="card-header d-flex justify-content-between align-items-center">
          <h5 class="mb-0">{{ title }}</h5>
          <ng-content select="[cardActions]" />
        </div>
      }
      <div class="card-body" [ngClass]="blockClass">
        <ng-content />
      </div>
    </div>
  `,
})
export class GuruCardComponent {
  @Input() title = '';
  @Input() cardClass = '';
  @Input() blockClass = '';
}

@Component({
  selector: 'app-spinner',
  standalone: true,
  template: `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  `,
})
export class SpinnerComponent {}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        @for (item of items; track item.label; let last = $last) {
          <li class="breadcrumb-item" [class.active]="last">
            @if (!last && item.link) {
              <a [routerLink]="item.link">{{ item.label }}</a>
            } @else {
              {{ item.label }}
            }
          </li>
        }
      </ol>
    </nav>
  `,
})
export class BreadcrumbComponent {
  @Input() items: { label: string; link?: string }[] = [];
}

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="text-center py-5 text-muted">
      <i class="icofont icofont-search-document" style="font-size: 3rem"></i>
      <p class="mt-3 mb-0">{{ message }}</p>
      @if (actionLabel) {
        <button class="btn btn-primary mt-3" (click)="action.emit()">{{ actionLabel }}</button>
      }
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() message = 'No items found';
  @Input() actionLabel = '';
  action = output<void>();
}

@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    @if (totalPages > 1) {
      <nav class="mt-3">
        <ul class="pagination justify-content-center">
          <li class="page-item" [class.disabled]="page <= 1">
            <button class="page-link" (click)="pageChange.emit(page - 1)" [disabled]="page <= 1">Prev</button>
          </li>
          @for (p of pages; track p) {
            <li class="page-item" [class.active]="p === page">
              <button class="page-link" (click)="pageChange.emit(p)">{{ p }}</button>
            </li>
          }
          <li class="page-item" [class.disabled]="page >= totalPages">
            <button class="page-link" (click)="pageChange.emit(page + 1)" [disabled]="page >= totalPages">Next</button>
          </li>
        </ul>
      </nav>
    }
  `,
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() totalPages = 1;
  pageChange = output<number>();

  get pages(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    return pages.slice(0, 10);
  }
}

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container-fixed">
      @for (t of toastService.toasts(); track t.id) {
        <div class="alert alert-dismissible fade show mb-2" [ngClass]="alertClass(t.type)" role="alert">
          {{ t.message }}
          <button type="button" class="btn-close" (click)="toastService.dismiss(t.id)"></button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  toastService = inject(ToastService);

  alertClass(type: string): string {
    return (
      { success: 'alert-success', error: 'alert-danger', info: 'alert-info', warning: 'alert-warning' }[type] ??
      'alert-info'
    );
  }
}
