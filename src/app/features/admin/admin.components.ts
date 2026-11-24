import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription as RxSubscription } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { AdminDashboardService, AdminUserService, NotificationService } from '../../core/services/domain.service';
import { BookService, AuthorService, GenreService, SeriesService } from '../../core/services/catalog.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { AuthService } from '../../core/auth/auth.service';
import { GuruCardComponent, SpinnerComponent, PaginationComponent, EmptyStateComponent, BreadcrumbComponent } from '../../shared/layout/layout.components';
import { FileUploadComponent } from '../../shared/components/shared.components';
import { ToastService } from '../../shared/services/toast.service';
import { DashboardStats, DashboardAnalytics, AnalyticsGranularity, AnalyticsPoint, AnalyticsComparison, RecentActivity, Notification, BroadcastNotificationDto } from '../../core/models/notification.model';
import { User } from '../../core/models/user.model';
import { Book, Author, Genre, Series, CreateBookDto } from '../../core/models/book.model';
import { SubscriptionPlan } from '../../core/models/subscription-plan.model';
import { Subscription } from '../../core/models/subscription.model';
import { Role, BookStatus, PlanInterval, NotificationType } from '../../core/models/enums.model';
import { formatDate, formatBytes, BOOK_FILE_TYPES, IMAGE_FILE_TYPES, getEntityId, getUserLabel, getPlanName } from '../../core/utils/helpers';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, GuruCardComponent, SpinnerComponent],
  template: `
    <h2 class="mb-4">Dashboard</h2>
    @if (loading()) { <app-spinner /> } @else if (stats()) {
      <div class="row">
        <div class="col-md-3"><div class="card widget-card-1"><div class="card-block-small"><i class="icofont icofont-users bg-c-blue card1-icon"></i><span class="text-c-blue">Users</span><h4>{{ stats()!.totalUsers }}</h4></div></div></div>
        <div class="col-md-3"><div class="card widget-card-1"><div class="card-block-small"><i class="icofont icofont-book bg-c-pink card1-icon"></i><span class="text-c-pink">Books</span><h4>{{ stats()!.totalBooks }}</h4></div></div></div>
        <div class="col-md-3"><div class="card widget-card-1"><div class="card-block-small"><i class="icofont icofont-credit-card bg-c-green card1-icon"></i><span class="text-c-green">Active Subs</span><h4>{{ stats()!.activeSubscriptions }}</h4></div></div></div>
        <div class="col-md-3"><div class="card widget-card-1"><div class="card-block-small"><i class="icofont icofont-lock bg-c-yellow card1-icon"></i><span class="text-c-yellow">Locked Books</span><h4>{{ stats()!.lockedBooks }}</h4></div></div></div>
      </div>

      <app-guru-card title="Reading and logins">
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <div class="btn-group btn-group-sm">
            @for (option of granularities; track option) {
              <button type="button" class="btn" [class.btn-primary]="granularity() === option" [class.btn-outline-primary]="granularity() !== option" (click)="setGranularity(option)">{{ option }}</button>
            }
          </div>
          <button type="button" class="btn btn-outline-secondary btn-sm" (click)="exportCsv()" [disabled]="exporting() || !analytics()">{{ exporting() ? 'Exporting...' : 'Export CSV' }}</button>
        </div>
        <div class="d-flex gap-3 small mb-3">
          <span><i class="d-inline-block rounded" style="width:10px;height:10px;background:#4099ff"></i> Reading users</span>
          <span><i class="d-inline-block rounded" style="width:10px;height:10px;background:#2ed8b6"></i> Logged-in users</span>
        </div>
        @if (analytics()) {
          <div class="row g-2 mb-3">
            <div class="col-md-4"><div class="border rounded p-2"><div class="text-muted small">Reading users</div><strong>{{ analytics()!.totals.readingUsers }}</strong><div class="small text-muted">{{ changeText(analytics()!.comparison.readingUsers) }}</div></div></div>
            <div class="col-md-4"><div class="border rounded p-2"><div class="text-muted small">Logged-in users</div><strong>{{ analytics()!.totals.loggedInUsers }}</strong><div class="small text-muted">{{ changeText(analytics()!.comparison.loggedInUsers) }}</div></div></div>
            <div class="col-md-4"><div class="border rounded p-2"><div class="text-muted small">New signups</div><strong>{{ analytics()!.totals.newSignups }}</strong><div class="small text-muted">{{ changeText(analytics()!.comparison.newSignups) }}</div></div></div>
            <div class="col-md-4"><div class="border rounded p-2"><div class="text-muted small">Revenue</div><strong>{{ analytics()!.payments.revenueCents / 100 | currency:'USD' }}</strong><div class="small text-muted">{{ analytics()!.payments.succeededCount }} paid · {{ moneyChange(analytics()!.comparison.revenueCents.change) }}</div></div></div>
            <div class="col-md-4"><div class="border rounded p-2"><div class="text-muted small">Failed payments</div><strong>{{ analytics()!.payments.failedCount }}</strong><div class="small text-muted">{{ analytics()!.payments.failedAmountCents / 100 | currency:'USD' }} due · {{ changeText(analytics()!.comparison.failedPayments) }}</div></div></div>
            <div class="col-md-4"><div class="border rounded p-2"><div class="text-muted small">Completion</div><strong>{{ analytics()!.completion.rate * 100 | number:'1.0-0' }}%</strong><div class="small text-muted">{{ analytics()!.completion.completed }} of {{ analytics()!.completion.activeReaders }} · {{ changeText(analytics()!.comparison.completionRate, true) }}</div></div></div>
          </div>
          <div class="overflow-auto">
            <svg [attr.viewBox]="'0 0 ' + chartWidth() + ' 200'" [attr.width]="chartWidth()" height="200" role="img" aria-label="Reading users and logged-in users">
              @for (bar of chartBars(); track bar.period) {
                <rect [attr.x]="bar.readingX" [attr.y]="bar.readingY" width="10" [attr.height]="bar.readingHeight" fill="#4099ff">
                  <title>{{ bar.period }}: {{ bar.readingUsers }} reading users</title>
                </rect>
                <rect [attr.x]="bar.loginX" [attr.y]="bar.loginY" width="10" [attr.height]="bar.loginHeight" fill="#2ed8b6">
                  <title>{{ bar.period }}: {{ bar.loggedInUsers }} logged-in users</title>
                </rect>
                @if (bar.showLabel) {
                  <text [attr.x]="bar.labelX" y="194" font-size="9" fill="#6c757d">{{ bar.label }}</text>
                }
              }
            </svg>
          </div>
          <p class="text-muted small mt-2 mb-3">Login counts start from this release. Earlier sign-ins were not stored.</p>
          <h6>Genres</h6>
          @for (genre of analytics()!.genres; track genre.genreId) {
            <div class="mb-2">
              <div class="d-flex justify-content-between small"><span>{{ genre.name }}</span><span>{{ genre.readers }} readers · {{ genre.sessions }} sessions</span></div>
              <div class="progress" style="height: 8px"><div class="progress-bar" [style.width.%]="genreWidth(genre.readers)"></div></div>
            </div>
          } @empty { <p class="text-muted small">No genre activity in this range</p> }
        } @else if (analyticsLoading()) {
          <app-spinner />
        }
        <h6 class="mt-4">Top books</h6>
        <table class="table table-sm mb-0">
          <thead><tr><th>Title</th><th>Readers</th><th>Sessions</th><th>Minutes</th></tr></thead>
          <tbody>
            @for (book of analytics()?.topBooks ?? []; track book.bookId) {
              <tr><td>{{ book.title }}</td><td>{{ book.readers }}</td><td>{{ book.sessions }}</td><td>{{ book.minutes }}</td></tr>
            } @empty { <tr><td colspan="4" class="text-muted">No reading sessions in this range</td></tr> }
          </tbody>
        </table>
      </app-guru-card>

      <app-guru-card title="Recent Activity">
        <table class="table"><tbody>
          @for (a of activity(); track $index) {
            <tr><td>{{ a.description }}</td><td class="text-muted">{{ a.createdAt | date:'short' }}</td></tr>
          } @empty { <tr><td colspan="2">No recent activity</td></tr> }
        </tbody></table>
      </app-guru-card>
    }
  `,
})
export class AdminDashboardComponent implements OnInit {
  private dashboard = inject(AdminDashboardService);
  loading = signal(true);
  analyticsLoading = signal(true);
  stats = signal<DashboardStats | null>(null);
  activity = signal<RecentActivity[]>([]);
  analytics = signal<DashboardAnalytics | null>(null);
  granularity = signal<AnalyticsGranularity>('month');
  granularities: AnalyticsGranularity[] = ['day', 'month', 'year'];
  exporting = signal(false);

  ngOnInit(): void {
    this.dashboard.getStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => this.loading.set(false),
    });
    this.dashboard.getRecentActivity().subscribe({
      next: (a) => { this.activity.set(a); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.loadAnalytics();
  }

  setGranularity(value: AnalyticsGranularity): void {
    if (this.granularity() === value) return;
    this.granularity.set(value);
    this.loadAnalytics();
  }

  chartWidth(): number {
    return Math.max(240, (this.analytics()?.series.length ?? 0) * 36);
  }

  chartBars(): Array<AnalyticsPoint & { readingX: number; loginX: number; readingY: number; loginY: number; readingHeight: number; loginHeight: number; labelX: number; label: string; showLabel: boolean }> {
    const series = this.analytics()?.series ?? [];
    const max = Math.max(1, ...series.map((point) => Math.max(point.readingUsers, point.loggedInUsers)));
    const every = this.granularity() === 'day' ? 5 : 1;
    return series.map((point, index) => {
      const readingHeight = Math.round((point.readingUsers / max) * 150);
      const loginHeight = Math.round((point.loggedInUsers / max) * 150);
      const x = index * 36;
      return {
        ...point,
        readingX: x,
        loginX: x + 12,
        readingHeight,
        loginHeight,
        readingY: 170 - readingHeight,
        loginY: 170 - loginHeight,
        labelX: x,
        label: this.granularity() === 'day' ? point.period.slice(5) : point.period,
        showLabel: index % every === 0,
      };
    });
  }

  changeText(value: AnalyticsComparison, rate = false): string {
    const amount = rate ? Math.round(value.change * 100) : value.change;
    const sign = amount > 0 ? '+' : '';
    return rate ? `${sign}${amount} pts vs previous` : `${sign}${amount} vs previous`;
  }

  moneyChange(cents: number): string {
    const sign = cents > 0 ? '+' : cents < 0 ? '-' : '';
    return `${sign}$${Math.abs(cents / 100).toFixed(2)} vs previous`;
  }

  genreWidth(readers: number): number {
    const max = Math.max(1, ...(this.analytics()?.genres ?? []).map((genre) => genre.readers));
    return Math.round((readers / max) * 100);
  }

  exportCsv(): void {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.dashboard.exportAnalytics(this.granularity()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `storyshelf-analytics-${this.granularity()}-${new Date().toISOString()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        this.exporting.set(false);
      },
      error: () => this.exporting.set(false),
    });
  }

  private loadAnalytics(): void {
    this.analyticsLoading.set(true);
    this.dashboard.getAnalytics(this.granularity()).subscribe({
      next: (data) => {
        this.analytics.set(data);
        this.analyticsLoading.set(false);
      },
      error: () => this.analyticsLoading.set(false),
    });
  }
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, RouterLink, GuruCardComponent, SpinnerComponent, PaginationComponent],
  template: `
    <div class="d-flex justify-content-between mb-4">
      <h2>Users</h2>
      <div>
        <a routerLink="/admin/users/deleted" class="btn btn-outline-secondary btn-sm me-2">Deleted</a>
        <a routerLink="/admin/users/new" class="btn btn-primary btn-sm">Add User</a>
      </div>
    </div>
    @if (loading()) { <app-spinner /> } @else {
      <app-guru-card>
        <table class="table table-hover">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (u of users(); track u._id) {
              <tr>
                <td>{{ u.firstName }} {{ u.lastName }}</td>
                <td>{{ u.email }}</td>
                <td><span class="badge bg-secondary">{{ u.role }}</span></td>
                <td><span class="badge" [class.bg-success]="u.isActive" [class.bg-danger]="!u.isActive">{{ u.isActive ? 'Active' : 'Inactive' }}</span></td>
                <td>
                  <a [routerLink]="['/admin/users', u._id]" class="btn btn-sm btn-outline-primary">Edit</a>
                  <button class="btn btn-sm btn-outline-danger ms-1" (click)="deleteUser(u._id)">Delete</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="text-center text-muted py-4">No users found</td></tr>
            }
          </tbody>
        </table>
        <app-pagination [page]="page()" [totalPages]="totalPages()" (pageChange)="onPage($event)" />
      </app-guru-card>
    }
  `,
})
export class AdminUsersComponent implements OnInit {
  private service = inject(AdminUserService);
  private toast = inject(ToastService);
  loading = signal(true);
  users = signal<User[]>([]);
  page = signal(1);
  totalPages = signal(1);
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading.set(true);
    this.service.list({ page: this.page(), limit: 20 }).subscribe({
      next: (r) => {
        this.users.set(r.items);
        this.totalPages.set(r.meta.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.users.set([]);
        this.loading.set(false);
      },
    });
  }
  onPage(p: number): void { this.page.set(p); this.load(); }
  deleteUser(id: string): void {
    if (confirm('Soft delete this user?')) this.service.delete(id).subscribe(() => { this.toast.success('User deleted'); this.load(); });
  }
}

@Component({
  selector: 'app-admin-users-deleted',
  standalone: true,
  imports: [CommonModule, RouterLink, GuruCardComponent, SpinnerComponent],
  template: `
    <h2 class="mb-4">Deleted Users</h2>
    <app-guru-card>
      <table class="table"><thead><tr><th>Email</th><th></th></tr></thead>
        <tbody>@for (u of users(); track u._id) {
          <tr><td>{{ u.email }}</td><td><button class="btn btn-sm btn-success" (click)="restore(u._id)">Restore</button></td></tr>
        }</tbody>
      </table>
    </app-guru-card>
  `,
})
export class AdminUsersDeletedComponent implements OnInit {
  private service = inject(AdminUserService);
  private toast = inject(ToastService);
  users = signal<User[]>([]);
  ngOnInit(): void { this.service.listDeleted().subscribe((r) => this.users.set(r.items)); }
  restore(id: string): void { this.service.restore(id).subscribe(() => { this.toast.success('Restored'); this.ngOnInit(); }); }
}

@Component({
  selector: 'app-admin-user-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GuruCardComponent, SpinnerComponent],
  template: `
    <h2 class="mb-4">{{ isEdit ? 'Edit User' : 'Create User' }}</h2>
    <app-guru-card>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="row">
          <div class="col-md-6 mb-3"><label class="form-label">First Name</label><input class="form-control" formControlName="firstName" /></div>
          <div class="col-md-6 mb-3"><label class="form-label">Last Name</label><input class="form-control" formControlName="lastName" /></div>
          <div class="col-md-6 mb-3"><label class="form-label">Email</label><input type="email" class="form-control" formControlName="email" /></div>
          @if (!isEdit) { <div class="col-md-6 mb-3"><label class="form-label">Password</label><input type="password" class="form-control" formControlName="password" /></div> }
          <div class="col-md-6 mb-3"><label class="form-label">Role</label>
            <select class="form-select" formControlName="role">
              <option value="user">User</option>
              @if (auth.currentUser()?.isSuperAdmin) { <option value="admin">Admin</option> }
            </select>
          </div>
          <div class="col-md-6 mb-3 d-flex align-items-end">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="isEmailVerified" formControlName="isEmailVerified" />
              <label class="form-check-label" for="isEmailVerified">Email verified</label>
            </div>
          </div>
        </div>
        @if (isEdit) {
          <button type="button" class="btn btn-outline-warning me-2" (click)="toggleActive()">{{ user()?.isActive ? 'Deactivate' : 'Activate' }}</button>
        }
        <button class="btn btn-primary">{{ isEdit ? 'Update' : 'Create' }}</button>
      </form>
    </app-guru-card>
  `,
})
export class AdminUserFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(AdminUserService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  isEdit = false;
  user = signal<User | null>(null);
  form = this.fb.group({
    firstName: ['', Validators.required], lastName: ['', Validators.required],
    email: ['', Validators.required], password: [''], role: ['user'],
    isEmailVerified: [true],
  });
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEdit = true;
      this.service.getById(id).subscribe((u) => { this.user.set(u); this.form.patchValue(u); });
    }
  }
  submit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    const v = this.form.getRawValue();
    const req = this.isEdit ? this.service.update(id, v as never) : this.service.create(v as never);
    req.subscribe(() => { this.toast.success('Saved'); this.router.navigate(['/admin/users']); });
  }
  toggleActive(): void {
    const u = this.user()!;
    this.service.activate(u._id, !u.isActive).subscribe(() => this.ngOnInit());
  }
}

@Component({
  selector: 'app-admin-books',
  standalone: true,
  imports: [CommonModule, RouterLink, GuruCardComponent, SpinnerComponent, PaginationComponent, FormsModule],
  template: `
    <div class="d-flex justify-content-between mb-4"><h2>Books</h2><a routerLink="/admin/books/new" class="btn btn-primary btn-sm">Add Book</a></div>
    <div class="mb-3">
      <select class="form-select w-auto d-inline-block" [(ngModel)]="statusFilter" (change)="load()">
        <option value="">All</option><option value="draft">Draft</option><option value="published">Published</option>
      </select>
    </div>
    @if (loading()) { <app-spinner /> } @else {
      <app-guru-card>
        <table class="table table-hover">
          <thead><tr><th>Title</th><th>Status</th><th>Locked</th><th>Release</th><th></th></tr></thead>
          <tbody>@for (b of books(); track b._id) {
            <tr>
              <td>{{ b.title }}</td>
              <td><span class="badge" [class.bg-c-blue]="b.status==='draft'" [class.bg-c-green]="b.status==='published'">{{ b.status }}</span></td>
              <td>@if (b.isLocked) { <i class="icofont icofont-lock text-c-pink"></i> }</td>
              <td>{{ formatDate(b.releaseDate) }}</td>
              <td><a [routerLink]="['/admin/books', b._id]" class="btn btn-sm btn-outline-primary">Edit</a></td>
            </tr>
          }</tbody>
        </table>
        <app-pagination [page]="page()" [totalPages]="totalPages()" (pageChange)="onPage($event)" />
      </app-guru-card>
    }
  `,
})
export class AdminBooksComponent implements OnInit {
  private service = inject(BookService);
  loading = signal(true);
  books = signal<Book[]>([]);
  page = signal(1);
  totalPages = signal(1);
  statusFilter = '';
  formatDate = formatDate;
  ngOnInit(): void { this.load(); }
  load(): void {
    this.service.adminList({ page: this.page(), limit: 20, status: this.statusFilter || undefined }).subscribe((r) => {
      this.books.set(r.items); this.totalPages.set(r.meta.totalPages); this.loading.set(false);
    });
  }
  onPage(p: number): void { this.page.set(p); this.load(); }
}

@Component({
  selector: 'app-admin-book-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, GuruCardComponent, FileUploadComponent, SpinnerComponent],
  template: `
    <h2 class="mb-4">{{ isEdit ? 'Edit Book' : 'Create Book' }}</h2>
    <div class="row">
      <div class="col-md-8">
        <app-guru-card title="Metadata">
          <form [formGroup]="form">
            <div class="mb-3"><label class="form-label">Title</label><input class="form-control" formControlName="title" /></div>
            <div class="mb-3"><label class="form-label">Description</label><textarea class="form-control" rows="4" formControlName="description"></textarea></div>
            <div class="mb-3"><label class="form-label">Short Story / Preview</label><textarea class="form-control" rows="3" formControlName="shortStory"></textarea></div>
            <div class="row">
              <div class="col-md-6 mb-3"><label class="form-label">Author</label>
                <select class="form-select" formControlName="authorId">@for (a of authors(); track a._id) { <option [value]="a._id">{{ a.name }}</option> }</select>
              </div>
              <div class="col-md-6 mb-3"><label class="form-label">Release Date</label><input type="date" class="form-control" formControlName="releaseDate" /></div>
              <div class="col-md-6 mb-3"><label class="form-label">Page Count</label><input type="number" class="form-control" formControlName="pageCount" /></div>
              <div class="col-md-6 mb-3 form-check mt-4"><input type="checkbox" class="form-check-input" formControlName="isLocked" id="locked" /><label class="form-check-label" for="locked">Premium (Locked)</label></div>
            </div>
            <div class="mb-3"><label class="form-label">Genres</label>
              <div class="border rounded p-2 d-flex flex-wrap gap-3" style="max-height: 180px; overflow-y: auto">
                @for (g of genres(); track g._id) {
                  <div class="form-check">
                    <input type="checkbox" class="form-check-input" [id]="'genre-' + g._id"
                      [checked]="isGenreSelected(g._id)" (change)="toggleGenre(g._id)" />
                    <label class="form-check-label" [for]="'genre-' + g._id">{{ g.name }}</label>
                  </div>
                } @empty { <small class="text-muted">No genres available</small> }
              </div>
            </div>
            <button type="button" class="btn btn-primary" (click)="save()">Save Metadata</button>
          </form>
        </app-guru-card>
      </div>
      @if (isEdit) {
        <div class="col-md-4">
          <app-guru-card title="Cover">
            <app-file-upload accept="image/*" [allowedTypes]="imageTypes" [uploading]="uploadingCover()" (fileSelected)="uploadCover($event)" />
          </app-guru-card>
          <app-guru-card title="Book File">
            <app-file-upload accept=".pdf,.epub" [allowedTypes]="bookTypes" [uploading]="uploadingFile()" (fileSelected)="uploadFile($event)" />
            @if (book()?.fileSizeBytes) { <small class="text-muted">{{ formatBytes(book()!.fileSizeBytes) }}</small> }
          </app-guru-card>
          <app-guru-card title="Actions">
            @if (book()?.status === 'draft') {
              <button class="btn btn-success w-100 mb-2" (click)="publish()">Publish</button>
            }
            <button class="btn btn-outline-warning w-100 mb-2" (click)="toggleLock()">{{ book()?.isLocked ? 'Unlock' : 'Lock' }}</button>
            <button class="btn btn-outline-danger w-100" (click)="deleteBook()">Delete</button>
          </app-guru-card>
        </div>
      }
    </div>
  `,
})
export class AdminBookFormComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private bookService = inject(BookService);
  private authorService = inject(AuthorService);
  private genreService = inject(GenreService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  isEdit = false;
  book = signal<Book | null>(null);
  authors = signal<Author[]>([]);
  genres = signal<Genre[]>([]);
  uploadingCover = signal(false);
  uploadingFile = signal(false);
  bookTypes = BOOK_FILE_TYPES;
  imageTypes = IMAGE_FILE_TYPES;
  formatBytes = formatBytes;
  form = this.fb.group({
    title: ['', Validators.required], description: ['', Validators.required], shortStory: [''],
    authorId: ['', Validators.required], genreIds: [[] as string[]], releaseDate: [''],
    pageCount: [0], isLocked: [false],
  });
  ngOnInit(): void {
    this.authorService.list({ limit: 100 }).subscribe((r) => this.authors.set(r.items));
    this.genreService.list({ limit: 100 }).subscribe((r) => this.genres.set(r.items));
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEdit = true;
      this.bookService.adminGet(id).subscribe((b) => {
        this.book.set(b);
        this.form.patchValue({
          ...b,
          authorId: getEntityId(b.authorId),
          genreIds: b.genreIds.map(getEntityId),
          releaseDate: b.releaseDate?.split('T')[0] ?? '',
        });
      });
    }
  }
  isGenreSelected(id: string): boolean {
    return (this.form.controls.genreIds.value ?? []).includes(id);
  }
  toggleGenre(id: string): void {
    const current = this.form.controls.genreIds.value ?? [];
    this.form.controls.genreIds.setValue(
      current.includes(id) ? current.filter((g) => g !== id) : [...current, id],
    );
    this.form.controls.genreIds.markAsDirty();
  }
  save(): void {
    const v = this.form.getRawValue();
    const dto = {
      title: v.title!,
      description: v.description!,
      shortStory: v.shortStory || undefined,
      authorId: v.authorId!,
      genreIds: (v.genreIds as string[]) || [],
      pageCount: Number(v.pageCount) || undefined,
      releaseDate: v.releaseDate || undefined,
      isLocked: v.isLocked ?? false,
    } satisfies CreateBookDto;
    const id = this.route.snapshot.paramMap.get('id')!;
    if (this.isEdit) {
      this.bookService.update(id, dto).subscribe((b) => { this.book.set(b); this.toast.success('Saved'); });
    } else {
      this.bookService.create(dto).subscribe((b) => { this.toast.success('Created'); this.router.navigate(['/admin/books', b._id]); });
    }
  }
  uploadCover(file: File): void {
    this.uploadingCover.set(true);
    this.bookService.uploadCover(this.route.snapshot.paramMap.get('id')!, file).subscribe({
      next: (b) => { this.book.set(b); this.uploadingCover.set(false); this.toast.success('Cover uploaded'); },
      error: () => this.uploadingCover.set(false),
    });
  }
  uploadFile(file: File): void {
    this.uploadingFile.set(true);
    this.bookService.uploadFile(this.route.snapshot.paramMap.get('id')!, file).subscribe({
      next: (b) => { this.book.set(b); this.uploadingFile.set(false); this.toast.success('File uploaded'); },
      error: () => this.uploadingFile.set(false),
    });
  }
  publish(): void {
    const b = this.book()!;
    if (!b.coverImageUrl || !b.fileUrl) {
      if (!confirm('Missing cover or file. Publish anyway?')) return;
    }
    this.bookService.publish(b._id).subscribe((book) => { this.book.set(book); this.toast.success('Published'); });
  }
  toggleLock(): void { this.bookService.toggleLock(this.book()!._id).subscribe((b) => this.book.set(b)); }
  deleteBook(): void {
    if (confirm('Delete this book?')) this.bookService.delete(this.book()!._id).subscribe(() => this.router.navigate(['/admin/books']));
  }
}

@Component({
  selector: 'app-admin-taxonomy',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GuruCardComponent, SpinnerComponent],
  template: `
    <h2 class="mb-4">{{ title }}</h2>
    @if (loading()) { <app-spinner /> }
    <div class="row">
      <div class="col-md-4">
        <app-guru-card [title]="'Add ' + singular">
          <form [formGroup]="form" (ngSubmit)="create()">
            @for (field of fields; track field.key) {
              <div class="mb-3"><label class="form-label">{{ field.label }}</label>
                @if (field.type === 'textarea') { <textarea class="form-control" [formControlName]="field.key"></textarea> }
                @else { <input class="form-control" [formControlName]="field.key" /> }
              </div>
            }
            <button class="btn btn-primary w-100">Create</button>
          </form>
        </app-guru-card>
      </div>
      <div class="col-md-8">
        <app-guru-card [title]="title + ' List'">
          <table class="table"><thead><tr>@for (col of columns; track col) { <th>{{ col }}</th> }<th></th></tr></thead>
            <tbody>
              @for (item of items(); track getItemId(item)) {
                <tr>
                  @for (col of columnKeys; track col) {
                    <td>{{ item[col] ?? '—' }}</td>
                  }
                  <td>
                    <button class="btn btn-sm btn-outline-danger" (click)="remove(getItemId(item))">Delete</button>
                  </td>
                </tr>
              } @empty {
                <tr><td [attr.colspan]="columns.length + 1" class="text-center text-muted py-4">No {{ title | lowercase }} found</td></tr>
              }
            </tbody>
          </table>
        </app-guru-card>
      </div>
    </div>
  `,
})
export class AdminTaxonomyComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private authorService = inject(AuthorService);
  private genreService = inject(GenreService);
  private seriesService = inject(SeriesService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  private routeSub?: RxSubscription;

  type = '';
  title = '';
  singular = '';
  columns: string[] = [];
  columnKeys: string[] = [];
  fields: { key: string; label: string; type?: string }[] = [];
  items = signal<Record<string, unknown>[]>([]);
  loading = signal(false);
  form!: ReturnType<FormBuilder['group']>;

  ngOnInit(): void {
    this.routeSub = this.route.data.subscribe((data) => {
      this.initTaxonomy(String(data['taxonomy'] ?? ''));
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  getItemId(item: Record<string, unknown>): string {
    return getEntityId(item['_id'] ?? item['id']);
  }

  private initTaxonomy(type: string): void {
    this.type = type;
    this.items.set([]);

    if (type === 'authors') {
      this.title = 'Authors';
      this.singular = 'Author';
      this.columns = ['Name', 'Bio'];
      this.columnKeys = ['name', 'bio'];
      this.fields = [
        { key: 'name', label: 'Name' },
        { key: 'bio', label: 'Bio', type: 'textarea' },
      ];
      this.form = this.fb.group({ name: ['', Validators.required], bio: [''] });
      this.loadAuthors();
    } else if (type === 'genres') {
      this.title = 'Genres';
      this.singular = 'Genre';
      this.columns = ['Name', 'Slug'];
      this.columnKeys = ['name', 'slug'];
      this.fields = [
        { key: 'name', label: 'Name' },
        { key: 'description', label: 'Description', type: 'textarea' },
      ];
      this.form = this.fb.group({ name: ['', Validators.required], description: [''] });
      this.loadGenres();
    } else if (type === 'series') {
      this.title = 'Series';
      this.singular = 'Series';
      this.columns = ['Title'];
      this.columnKeys = ['title'];
      this.fields = [
        { key: 'title', label: 'Title' },
        { key: 'description', label: 'Description', type: 'textarea' },
      ];
      this.form = this.fb.group({ title: ['', Validators.required], description: [''] });
      this.loadSeries();
    }
  }

  loadAuthors(): void {
    this.loading.set(true);
    this.authorService.list({ page: 1, limit: 100, sort: 'name' }).subscribe({
      next: (r) => {
        this.items.set(r.items as unknown as Record<string, unknown>[]);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.loading.set(false);
      },
    });
  }

  loadGenres(): void {
    this.loading.set(true);
    this.genreService.list({ page: 1, limit: 100, sort: 'name' }).subscribe({
      next: (r) => {
        this.items.set(r.items as unknown as Record<string, unknown>[]);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.loading.set(false);
      },
    });
  }

  loadSeries(): void {
    this.loading.set(true);
    this.seriesService.list({ page: 1, limit: 100, sort: 'title' }).subscribe({
      next: (r) => {
        this.items.set(r.items as unknown as Record<string, unknown>[]);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.loading.set(false);
      },
    });
  }

  create(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();

    if (this.type === 'authors') {
      this.authorService.create(v as never).subscribe({
        next: (created) => {
          this.toast.success('Created');
          this.items.update((list) => [...list, created as unknown as Record<string, unknown>]);
          this.form.reset();
        },
      });
    } else if (this.type === 'genres') {
      this.genreService.create(v as never).subscribe({
        next: (created) => {
          this.toast.success('Created');
          this.items.update((list) => [...list, created as unknown as Record<string, unknown>]);
          this.form.reset();
          this.loadGenres();
        },
      });
    } else if (this.type === 'series') {
      this.seriesService.create(v as never).subscribe({
        next: (created) => {
          this.toast.success('Created');
          this.items.update((list) => [...list, created as unknown as Record<string, unknown>]);
          this.form.reset();
        },
      });
    }
  }

  remove(id: string): void {
    if (!confirm('Delete?')) return;

    const onDeleted = () => {
      this.toast.success('Deleted');
      this.items.update((list) => list.filter((item) => this.getItemId(item) !== id));
    };

    if (this.type === 'authors') this.authorService.delete(id).subscribe(() => onDeleted());
    else if (this.type === 'genres') this.genreService.delete(id).subscribe(() => onDeleted());
    else if (this.type === 'series') this.seriesService.delete(id).subscribe(() => onDeleted());
  }
}

@Component({
  selector: 'app-admin-plans',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GuruCardComponent, SpinnerComponent],
  template: `
    <h2 class="mb-4">Subscription Plans</h2>
    <div class="row">
      <div class="col-md-4">
        <app-guru-card title="Create Plan">
          <form [formGroup]="form" (ngSubmit)="create()">
            <div class="mb-3"><label class="form-label">Name</label><input class="form-control" formControlName="name" /></div>
            <div class="mb-3"><label class="form-label">Price</label><input type="number" step="0.01" class="form-control" formControlName="price" /></div>
            <div class="mb-3"><label class="form-label">Interval</label>
              <select class="form-select" formControlName="interval">
                <option value="free">Free</option><option value="month">Month</option><option value="year">Year</option>
              </select>
            </div>
            <div class="mb-3 form-check"><input type="checkbox" class="form-check-input" formControlName="unlocksLockedBooks" id="unlock" /><label for="unlock">Unlocks locked books</label></div>
            <div class="mb-3">
              <label class="form-label">Features</label>
              <ul class="list-group mb-2">
                @for (feature of newFeatures(); track feature) {
                  <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span>{{ feature }}</span>
                    <button type="button" class="btn btn-sm btn-outline-danger" (click)="removeDraftFeature(feature)">Delete</button>
                  </li>
                } @empty {
                  <li class="list-group-item text-muted">No features yet</li>
                }
              </ul>
              <div class="input-group">
                <input class="form-control" placeholder="Add a feature" [value]="newFeatureDraft()" (input)="newFeatureDraft.set(inputValue($event))" (keydown.enter)="$event.preventDefault(); addDraftFeature()" />
                <button type="button" class="btn btn-outline-primary" (click)="addDraftFeature()">Add</button>
              </div>
            </div>
            <button class="btn btn-primary w-100" [disabled]="form.invalid">Create</button>
          </form>
        </app-guru-card>
      </div>
      <div class="col-md-8">
        <app-guru-card title="Plans">
          @if (loading()) { <app-spinner /> } @else {
            @for (p of plans(); track p._id) {
              <div class="border rounded p-3 mb-3">
                <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                  <div>
                    <h5 class="mb-1">{{ p.name }}</h5>
                    <div class="text-muted">{{ p.price | currency:(p.currency | uppercase) }} / {{ p.interval }} · {{ p.isActive ? 'Active' : 'Inactive' }}</div>
                  </div>
                  @if (!p.isDefault) {
                    <button type="button" class="btn btn-sm btn-outline-danger" (click)="remove(p._id)">Deactivate</button>
                  }
                </div>
                <ul class="list-group mb-2">
                  @for (feature of planFeatures(p); track feature) {
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      <span>{{ feature }}</span>
                      <button type="button" class="btn btn-sm btn-outline-danger" [disabled]="savingId() === p._id" (click)="removeFeature(p, feature)">Delete</button>
                    </li>
                  } @empty {
                    <li class="list-group-item text-muted">No features</li>
                  }
                </ul>
                <div class="input-group">
                  <input class="form-control" placeholder="Add a feature" [value]="draftFor(p._id)" (input)="setDraft(p._id, inputValue($event))" (keydown.enter)="addFeature(p)" />
                  <button type="button" class="btn btn-outline-primary" [disabled]="savingId() === p._id" (click)="addFeature(p)">Add</button>
                </div>
              </div>
            } @empty {
              <p class="text-muted mb-0">No plans yet</p>
            }
          }
        </app-guru-card>
      </div>
    </div>
  `,
})
export class AdminPlansComponent implements OnInit {
  private service = inject(SubscriptionService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  plans = signal<SubscriptionPlan[]>([]);
  loading = signal(true);
  savingId = signal<string | null>(null);
  featureDrafts = signal<Record<string, string>>({});
  newFeatures = signal<string[]>([]);
  newFeatureDraft = signal('');
  form = this.fb.group({
    name: ['', Validators.required], price: [0], interval: ['month'],
    unlocksLockedBooks: [true],
  });
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading.set(true);
    this.service.adminListPlans().subscribe({
      next: (r) => {
        this.plans.set(r.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
  planFeatures(plan: SubscriptionPlan): string[] {
    return plan.features ?? [];
  }
  draftFor(id: string): string {
    return this.featureDrafts()[id] ?? '';
  }
  setDraft(id: string, value: string): void {
    this.featureDrafts.update((drafts) => ({ ...drafts, [id]: value }));
  }
  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
  addDraftFeature(): void {
    const text = this.newFeatureDraft().trim();
    if (!text) return;
    if (this.newFeatures().includes(text)) {
      this.toast.error('Feature already added');
      return;
    }
    this.newFeatures.update((features) => [...features, text]);
    this.newFeatureDraft.set('');
  }
  removeDraftFeature(feature: string): void {
    this.newFeatures.update((features) => features.filter((item) => item !== feature));
  }
  addFeature(plan: SubscriptionPlan): void {
    const text = this.draftFor(plan._id).trim();
    if (!text) return;
    const current = this.planFeatures(plan);
    if (current.includes(text)) {
      this.toast.error('Feature already exists');
      return;
    }
    this.saveFeatures(plan, [...current, text], 'Feature added');
  }
  removeFeature(plan: SubscriptionPlan, feature: string): void {
    this.saveFeatures(
      plan,
      this.planFeatures(plan).filter((item) => item !== feature),
      'Feature removed',
    );
  }
  private saveFeatures(plan: SubscriptionPlan, features: string[], message: string): void {
    this.savingId.set(plan._id);
    this.service.adminUpdatePlan(plan._id, { features }).subscribe({
      next: () => {
        this.toast.success(message);
        this.setDraft(plan._id, '');
        this.savingId.set(null);
        this.load();
      },
      error: () => {
        this.toast.error('Could not update features');
        this.savingId.set(null);
      },
    });
  }
  create(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.service.adminCreatePlan({
      name: v.name!, price: v.price!, interval: v.interval as PlanInterval,
      unlocksLockedBooks: v.unlocksLockedBooks!, features: this.newFeatures(),
    }).subscribe(() => {
      this.toast.success('Plan created');
      this.form.reset({ name: '', price: 0, interval: 'month', unlocksLockedBooks: true });
      this.newFeatures.set([]);
      this.newFeatureDraft.set('');
      this.load();
    });
  }
  remove(id: string): void { this.service.adminDeletePlan(id).subscribe(() => this.load()); }
}

@Component({
  selector: 'app-admin-subscriptions',
  standalone: true,
  imports: [CommonModule, GuruCardComponent, SpinnerComponent],
  template: `
    <h2 class="mb-4">Subscriptions</h2>
    <app-guru-card>
      <table class="table table-hover">
        <thead><tr><th>User</th><th>Plan</th><th>Status</th><th>Period End</th></tr></thead>
        <tbody>
          @for (s of subs(); track s._id) {
            <tr>
              <td>{{ getUserLabel(s.userId) }}</td>
              <td>{{ getPlanName(s.planId) }}</td>
              <td><span class="badge bg-secondary">{{ s.status }}</span></td>
              <td>{{ formatDate(s.currentPeriodEnd) }}</td>
            </tr>
          } @empty {
            <tr><td colspan="4" class="text-center text-muted py-4">No subscriptions found</td></tr>
          }
        </tbody>
      </table>
    </app-guru-card>
  `,
})
export class AdminSubscriptionsComponent implements OnInit {
  private service = inject(SubscriptionService);
  subs = signal<Subscription[]>([]);
  formatDate = formatDate;
  getUserLabel = getUserLabel;
  getPlanName = getPlanName;
  ngOnInit(): void { this.service.adminListSubscriptions().subscribe((r) => this.subs.set(r.items)); }
}

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GuruCardComponent],
  template: `
    <h2 class="mb-4">Notifications</h2>
    <app-guru-card title="Broadcast">
      <form [formGroup]="form" (ngSubmit)="broadcast()">
        <div class="mb-3">
          <label class="form-label">Type</label>
          <select class="form-select" formControlName="type">
            <option [value]="NotificationType.System">System</option>
            <option [value]="NotificationType.Release">Release</option>
            <option [value]="NotificationType.Recommendation">Recommendation</option>
            <option [value]="NotificationType.Subscription">Subscription</option>
          </select>
        </div>
        <div class="mb-3"><label class="form-label">Title</label><input class="form-control" formControlName="title" /></div>
        <div class="mb-3"><label class="form-label">Body</label><textarea class="form-control" formControlName="body"></textarea></div>
        <button class="btn btn-primary" [disabled]="form.invalid">Send to All Users</button>
      </form>
    </app-guru-card>
  `,
})
export class AdminNotificationsComponent {
  private service = inject(NotificationService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  NotificationType = NotificationType;
  form = this.fb.group({
    type: [NotificationType.System, Validators.required],
    title: ['', Validators.required],
    body: ['', Validators.required],
  });
  broadcast(): void {
    if (this.form.invalid) return;
    this.service.broadcast(this.form.getRawValue() as BroadcastNotificationDto).subscribe(() => this.toast.success('Broadcast sent'));
  }
}
