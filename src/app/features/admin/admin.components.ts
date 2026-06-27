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
import { DashboardStats, RecentActivity, Notification, BroadcastNotificationDto } from '../../core/models/notification.model';
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
        <div class="col-md-3"><div class="card widget-card-1"><div class="card-block-small"><i class="icofont icofont-users bg-c-blue card1-icon"></i><span class="text-c-blue">Users</span><h4>{{ stats()!.users }}</h4></div></div></div>
        <div class="col-md-3"><div class="card widget-card-1"><div class="card-block-small"><i class="icofont icofont-book bg-c-pink card1-icon"></i><span class="text-c-pink">Books</span><h4>{{ stats()!.books }}</h4></div></div></div>
        <div class="col-md-3"><div class="card widget-card-1"><div class="card-block-small"><i class="icofont icofont-credit-card bg-c-green card1-icon"></i><span class="text-c-green">Active Subs</span><h4>{{ stats()!.activeSubscriptions }}</h4></div></div></div>
        <div class="col-md-3"><div class="card widget-card-1"><div class="card-block-small"><i class="icofont icofont-dollar bg-c-yellow card1-icon"></i><span class="text-c-yellow">Revenue</span><h4>{{ stats()!.revenue / 100 | currency:'USD' }}</h4></div></div></div>
      </div>
      <app-guru-card title="Recent Activity">
        <table class="table"><tbody>
          @for (a of activity(); track a.createdAt) {
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
  stats = signal<DashboardStats | null>(null);
  activity = signal<RecentActivity[]>([]);
  ngOnInit(): void {
    this.dashboard.getStats().subscribe((s) => this.stats.set(s));
    this.dashboard.getRecentActivity().subscribe((a) => { this.activity.set(a); this.loading.set(false); });
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
              <select class="form-select" multiple formControlName="genreIds">
                @for (g of genres(); track g._id) { <option [value]="g._id">{{ g.name }}</option> }
              </select>
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
    // Use sort=name so admin requests bypass stale Redis cache keys from public pages
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
            <div class="mb-3"><label class="form-label">Features (comma separated)</label><input class="form-control" formControlName="featuresStr" /></div>
            <button class="btn btn-primary w-100">Create</button>
          </form>
        </app-guru-card>
      </div>
      <div class="col-md-8">
        <app-guru-card title="Plans">
          <table class="table"><thead><tr><th>Name</th><th>Price</th><th>Active</th><th></th></tr></thead>
            <tbody>@for (p of plans(); track p._id) {
              <tr><td>{{ p.name }}</td><td>{{ p.price | currency:(p.currency | uppercase) }}</td><td>{{ p.isActive }}</td>
                <td>@if (!p.isDefault) { <button class="btn btn-sm btn-outline-danger" (click)="remove(p._id)">Deactivate</button> }</td></tr>
            }</tbody>
          </table>
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
  form = this.fb.group({
    name: ['', Validators.required], price: [0], interval: ['month'],
    unlocksLockedBooks: [true], featuresStr: [''],
  });
  ngOnInit(): void { this.load(); }
  load(): void { this.service.adminListPlans().subscribe((r) => this.plans.set(r.items)); }
  create(): void {
    const v = this.form.getRawValue();
    this.service.adminCreatePlan({
      name: v.name!, price: v.price!, interval: v.interval as PlanInterval,
      unlocksLockedBooks: v.unlocksLockedBooks!, features: v.featuresStr!.split(',').map((s) => s.trim()).filter(Boolean),
    }).subscribe(() => { this.toast.success('Plan created'); this.load(); });
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
