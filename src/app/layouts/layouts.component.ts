import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { NotificationService } from '../core/services/domain.service';
import { SearchBarComponent } from '../shared/components/shared.components';
import { ToastContainerComponent } from '../shared/layout/layout.components';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, SearchBarComponent, ToastContainerComponent],
  template: `
    <header class="pcoded-header d-flex align-items-center justify-content-between">
      <div class="d-flex align-items-center gap-3">
        <a routerLink="/" class="text-decoration-none d-flex align-items-center gap-2">
          <img src="assets/images/logo.png" alt="Storyshelf" height="32" />
          <strong class="text-dark">Storyshelf</strong>
        </a>
      </div>
      <div class="flex-grow-1 mx-4 d-none d-md-block" style="max-width: 400px">
        <app-search-bar />
      </div>
      <nav class="d-flex align-items-center gap-2">
        <a routerLink="/books" class="btn btn-link">Books</a>
        <a routerLink="/authors" class="btn btn-link">Authors</a>
        <a routerLink="/genres" class="btn btn-link">Genres</a>
        <a routerLink="/pricing" class="btn btn-link">Pricing</a>
        @if (auth.isAuthenticated() && !auth.isGuest()) {
          <a routerLink="/reading" class="btn btn-link">Reading</a>
          <a routerLink="/notifications" class="btn btn-link position-relative">
            <i class="icofont icofont-notification"></i>
            @if (unreadCount() > 0) {
              <span class="badge bg-danger position-absolute top-0 start-100 translate-middle">{{ unreadCount() }}</span>
            }
          </a>
          <a routerLink="/account" class="btn btn-outline-primary btn-sm">Account</a>
          <button class="btn btn-link btn-sm" (click)="logout()">Logout</button>
        } @else if (auth.isGuest()) {
          <span class="text-muted small">Guest</span>
          <button class="btn btn-link btn-sm" (click)="logout()">Logout</button>
        } @else {
          <a routerLink="/login" class="btn btn-outline-primary btn-sm">Login</a>
          <a routerLink="/register" class="btn btn-primary btn-sm">Register</a>
        }
      </nav>
    </header>
    <main class="container-fluid py-4">
      <router-outlet />
    </main>
    <footer class="text-center py-4 text-muted border-top">
      <small>&copy; Storyshelf — Your digital bookshelf</small>
    </footer>
    <app-toast-container />
  `,
})
export class PublicLayoutComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private notifications = inject(NotificationService);
  unreadCount = this.notifications.unreadCountState;
  private pollTimer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    if (this.auth.isAuthenticated() && !this.auth.isGuest()) this.pollNotifications();
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  private pollNotifications(): void {
    const load = () => this.notifications.unreadCount().subscribe();
    load();
    this.pollTimer = setInterval(load, environment.notificationPollMs);
  }

  logout(): void {
    this.auth.logout().subscribe();
  }
}

export interface AdminMenuItem {
  label: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ToastContainerComponent],
  template: `
    <div class="d-flex">
      <aside class="pcoded-navbar" [class.collapsed]="sidebarCollapsed()">
        <div class="p-3 text-center border-bottom border-secondary">
          <img src="assets/images/logo.png" alt="Storyshelf" height="28" />
          @if (!sidebarCollapsed()) { <div class="text-white mt-2 small">Admin Panel</div> }
        </div>
        <ul class="nav-menu list-unstyled mt-2">
          @for (item of menuItems; track item.route) {
            <li>
              <a [routerLink]="item.route" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.route === '/admin' }">
                <i [class]="item.icon"></i>
                @if (!sidebarCollapsed()) { {{ item.label }} }
              </a>
            </li>
          }
        </ul>
      </aside>
      <div class="pcoded-content flex-grow-1" [class.expanded]="sidebarCollapsed()">
        <header class="pcoded-header d-flex justify-content-between align-items-center">
          <button class="btn btn-link" (click)="toggleSidebar()"><i class="icofont icofont-navigation-menu"></i></button>
          <div class="d-flex align-items-center gap-2">
            <span class="text-muted">{{ auth.currentUser()?.email }}</span>
            <a routerLink="/" class="btn btn-sm btn-outline-secondary">View Site</a>
            <button class="btn btn-sm btn-outline-danger" (click)="logout()">Logout</button>
          </div>
        </header>
        <div class="p-4">
          <router-outlet />
        </div>
      </div>
    </div>
    <app-toast-container />
  `,
})
export class AdminLayoutComponent {
  auth = inject(AuthService);
  sidebarCollapsed = signal(false);

  menuItems: AdminMenuItem[] = [
    { label: 'Dashboard', route: '/admin', icon: 'icofont icofont-home' },
    { label: 'Users', route: '/admin/users', icon: 'icofont icofont-users' },
    { label: 'Books', route: '/admin/books', icon: 'icofont icofont-book' },
    { label: 'Authors', route: '/admin/authors', icon: 'icofont icofont-user-alt-3' },
    { label: 'Genres', route: '/admin/genres', icon: 'icofont icofont-tags' },
    { label: 'Series', route: '/admin/series', icon: 'icofont icofont-library' },
    { label: 'Plans', route: '/admin/plans', icon: 'icofont icofont-price' },
    { label: 'Subscriptions', route: '/admin/subscriptions', icon: 'icofont icofont-credit-card' },
    { label: 'Notifications', route: '/admin/notifications', icon: 'icofont icofont-notification' },
  ];

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  logout(): void {
    this.auth.logout().subscribe(() => {});
  }
}

@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, ToastContainerComponent],
  template: `
    <section class="auth-fluid">
      <div class="auth-body w-100 mx-3">
        <div class="text-center mb-4">
          <img src="assets/images/auth/logo-dark.png" alt="Storyshelf" height="40" />
        </div>
        <ng-content />
        <div class="text-center mt-3">
          <a routerLink="/" class="text-muted small">Back to home</a>
        </div>
      </div>
    </section>
    <app-toast-container />
  `,
})
export class AuthShellComponent {}
