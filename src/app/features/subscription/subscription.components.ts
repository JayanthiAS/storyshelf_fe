import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SubscriptionService } from '../../core/services/subscription.service';
import { UserService } from '../../core/services/domain.service';
import { AuthService } from '../../core/auth/auth.service';
import { PlanCardComponent } from '../../shared/components/shared.components';
import { GuruCardComponent, SpinnerComponent, EmptyStateComponent } from '../../shared/layout/layout.components';
import { ToastService } from '../../shared/services/toast.service';
import { SubscriptionPlan } from '../../core/models/subscription-plan.model';
import { SubscriptionMeResponse } from '../../core/models/subscription.model';
import { SubscriptionStatus } from '../../core/models/enums.model';
import { formatDate, getEntityId } from '../../core/utils/helpers';
import { User } from '../../core/models/user.model';
import { Book } from '../../core/models/book.model';
import { Notification } from '../../core/models/notification.model';
import { NotificationService, RecommendationService } from '../../core/services/domain.service';
import { BookCardComponent } from '../../shared/components/shared.components';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, PlanCardComponent, SpinnerComponent],
  template: `
    <h2 class="mb-4 text-center">Choose Your Plan</h2>
    @if (loading()) { <app-spinner /> } @else {
      <div class="row g-4 justify-content-center">
        @for (plan of plans(); track plan._id) {
          <div class="col-md-4">
            <app-plan-card
              [plan]="plan"
              [isCurrent]="isCurrentPlan(plan)"
              [ctaLabel]="ctaLabel(plan)"
              [disabled]="checkoutLoading() || isCurrentPlan(plan)"
              (select)="checkout($event)"
            />
          </div>
        }
      </div>
    }
  `,
})
export class PricingComponent implements OnInit {
  private subService = inject(SubscriptionService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  loading = signal(true);
  checkoutLoading = signal(false);
  plans = signal<SubscriptionPlan[]>([]);
  currentPlanId = signal<string | null>(null);
  currentPlanPrice = signal<number | null>(null);

  ngOnInit(): void {
    this.subService.getPlans({ limit: 20 }).subscribe((r) => { this.plans.set(r.items); this.loading.set(false); });
    if (this.auth.isAuthenticated()) {
      this.subService.getMySubscription().subscribe((r) => this.setCurrentPlan(r.plan));
    }
  }

  isCurrentPlan(plan: SubscriptionPlan): boolean {
    const currentId = this.currentPlanId();
    return !!currentId && currentId === getEntityId(plan);
  }

  ctaLabel(plan: SubscriptionPlan): string {
    if (!this.auth.isAuthenticated()) {
      return plan.price === 0 ? 'Sign up' : 'Sign up to subscribe';
    }
    if (this.isCurrentPlan(plan)) return 'Current Plan';
    const currentPrice = this.currentPlanPrice();
    if (currentPrice !== null) {
      if (plan.price < currentPrice) return 'Downgrade';
      if (plan.price > currentPrice) return 'Upgrade';
    }
    return 'Subscribe';
  }

  checkout(plan: SubscriptionPlan): void {
    if (!this.auth.isAuthenticated()) { this.router.navigate(['/register']); return; }
    if (this.isCurrentPlan(plan)) return;
    if (plan.price === 0 || plan.isDefault) {
      this.subService.upgrade(plan._id).subscribe({
        next: () => {
          this.setCurrentPlan(plan);
          this.toast.success('Plan updated');
        },
      });
      return;
    }
    this.checkoutLoading.set(true);
    this.subService.checkout(plan._id).subscribe({
      next: (r) => { window.location.href = r.url; },
      error: () => this.checkoutLoading.set(false),
    });
  }

  private setCurrentPlan(plan: SubscriptionPlan | string): void {
    if (typeof plan === 'string') {
      this.currentPlanId.set(plan);
      this.currentPlanPrice.set(null);
      return;
    }
    this.currentPlanId.set(getEntityId(plan));
    this.currentPlanPrice.set(plan.price);
  }
}

@Component({
  selector: 'app-subscription-success',
  standalone: true,
  imports: [CommonModule, RouterLink, SpinnerComponent],
  template: `
    <div class="text-center py-5">
      @if (polling()) { <app-spinner /><p>Confirming your subscription...</p> }
      @else {
        <i class="icofont icofont-check-circled text-c-green" style="font-size: 4rem"></i>
        <h2>Subscription Active!</h2>
        <a routerLink="/account" class="btn btn-primary mt-3">View Account</a>
      }
    </div>
  `,
})
export class SubscriptionSuccessComponent implements OnInit {
  private subService = inject(SubscriptionService);
  private route = inject(ActivatedRoute);
  polling = signal(true);
  private attempts = 0;

  ngOnInit(): void {
    const sessionId = this.route.snapshot.queryParamMap.get('session_id');
    if (sessionId) {
      this.subService.confirmCheckout(sessionId).subscribe({
        next: () => this.polling.set(false),
        error: () => this.retryPoll(),
      });
    } else {
      this.retryPoll();
    }
  }

  private retryPoll(): void {
    if (++this.attempts >= 10) {
      this.polling.set(false);
      return;
    }
    setTimeout(() => this.poll(), 2000);
  }

  private poll(): void {
    this.subService.getMySubscription().subscribe({
      next: (r) => {
        if (r.subscription.status === SubscriptionStatus.Active && !r.plan.isDefault) {
          this.polling.set(false);
        } else {
          this.retryPoll();
        }
      },
      error: () => this.polling.set(false),
    });
  }
}

@Component({
  selector: 'app-subscription-cancel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="text-center py-5">
      <h2>Checkout Cancelled</h2>
      <p class="text-muted">No charges were made.</p>
      <a routerLink="/pricing" class="btn btn-primary">Try Again</a>
    </div>
  `,
})
export class SubscriptionCancelComponent {}

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, GuruCardComponent, SpinnerComponent],
  template: `
    <h2 class="mb-4">My Account</h2>
    @if (loading()) { <app-spinner /> } @else {
      @if (subStatus() === 'past_due') {
        <div class="alert alert-warning">Payment past due. <button class="btn btn-sm btn-warning ms-2" (click)="openPortal()">Update Payment</button></div>
      }
      <div class="row">
        <div class="col-md-6">
          <app-guru-card title="Profile">
            <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
              <div class="mb-3"><label class="form-label">First Name</label><input class="form-control" formControlName="firstName" /></div>
              <div class="mb-3"><label class="form-label">Last Name</label><input class="form-control" formControlName="lastName" /></div>
              <div class="mb-3"><label class="form-label">New Password</label><input type="password" class="form-control" formControlName="password" placeholder="Leave blank to keep" /></div>
              <button class="btn btn-primary">Save</button>
            </form>
          </app-guru-card>
        </div>
        <div class="col-md-6">
          <app-guru-card title="Subscription">
            @if (subscription()) {
              <p><strong>{{ subscription()!.plan.name }}</strong> — {{ subscription()!.subscription.status }}</p>
              @if (subscription()!.subscription.currentPeriodEnd) {
                <p class="text-muted">Renews: {{ formatDate(subscription()!.subscription.currentPeriodEnd) }}</p>
              }
              <div class="d-flex gap-2 flex-wrap">
                <a routerLink="/pricing" class="btn btn-outline-primary btn-sm">Change Plan</a>
                @if (!subscription()!.plan.isDefault) {
                  <button class="btn btn-outline-secondary btn-sm" (click)="openPortal()">Billing Portal</button>
                  <button class="btn btn-outline-danger btn-sm" (click)="cancelSub()">Cancel</button>
                }
              </div>
            }
          </app-guru-card>
          <app-guru-card title="Quick Links">
            <a routerLink="/account/likes" class="d-block mb-2">Liked Books</a>
            <a routerLink="/reading" class="d-block mb-2">Continue Reading</a>
            <a routerLink="/notifications" class="d-block mb-2">Notifications</a>
            <a routerLink="/recommendations" class="d-block mb-2">Recommendations</a>
            <button class="btn btn-outline-danger btn-sm mt-2" (click)="deleteAccount()">Delete Account</button>
          </app-guru-card>
        </div>
      </div>
    }
  `,
})
export class AccountComponent implements OnInit {
  private userService = inject(UserService);
  private subService = inject(SubscriptionService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  loading = signal(true);
  subscription = signal<(SubscriptionMeResponse & { plan: SubscriptionPlan }) | null>(null);
  subStatus = signal('');
  formatDate = formatDate;
  profileForm = this.fb.group({ firstName: [''], lastName: [''], password: [''] });

  ngOnInit(): void {
    this.userService.getMe().subscribe((u) => this.profileForm.patchValue({ firstName: u.firstName, lastName: u.lastName }));
    this.subService.getMySubscription().subscribe((r) => {
      this.subscription.set(r as never);
      this.subStatus.set(r.subscription.status);
      this.loading.set(false);
    });
  }

  saveProfile(): void {
    const v = this.profileForm.getRawValue();
    const dto: Record<string, string> = { firstName: v.firstName!, lastName: v.lastName! };
    if (v.password) dto['password'] = v.password;
    this.userService.updateMe(dto).subscribe(() => this.toast.success('Profile updated'));
  }

  openPortal(): void {
    this.subService.portal().subscribe((r) => { window.location.href = r.url; });
  }

  cancelSub(): void {
    if (confirm('Cancel at end of billing period?')) {
      this.subService.cancel().subscribe(() => this.toast.success('Subscription cancelled'));
    }
  }

  deleteAccount(): void {
    if (confirm('Permanently delete your account?')) {
      this.userService.deleteMe().subscribe(() => this.toast.info('Account deleted'));
    }
  }
}

@Component({
  selector: 'app-likes',
  standalone: true,
  imports: [CommonModule, BookCardComponent, SpinnerComponent, EmptyStateComponent],
  template: `
    <h2 class="mb-4">Liked Books</h2>
    @if (loading()) { <app-spinner /> } @else if (!books().length) {
      <app-empty-state message="No liked books yet" actionLabel="Browse Books" (action)="router.navigate(['/books'])" />
    } @else {
      <div class="row g-3">@for (b of books(); track b._id) { <div class="col-md-3"><app-book-card [book]="b" /></div> }</div>
    }
  `,
})
export class LikesComponent implements OnInit {
  private userService = inject(UserService);
  router = inject(Router);
  loading = signal(true);
  books = signal<Book[]>([]);
  ngOnInit(): void { this.userService.getLikes().subscribe((r) => { this.books.set(r.items); this.loading.set(false); }); }
}

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, SpinnerComponent, EmptyStateComponent],
  template: `
    <div class="d-flex justify-content-between mb-4">
      <h2>Notifications</h2>
      <button class="btn btn-outline-secondary btn-sm" (click)="markAll()">Mark all read</button>
    </div>
    @if (loading()) { <app-spinner /> } @else if (!items().length) { <app-empty-state message="No notifications" /> }
    @else {
      @for (n of items(); track n._id) {
        <div class="card mb-2 p-3" role="button" [class.border-primary]="!n.isRead" (click)="open(n)">
          <div class="d-flex justify-content-between">
            <strong [class.fw-normal]="n.isRead">{{ n.title }}</strong>
            <small class="text-muted">{{ n.createdAt | date:'short' }}</small>
          </div>
          <p class="mb-0 text-muted">{{ n.body }}</p>
        </div>
      }
    }
  `,
})
export class NotificationsPageComponent implements OnInit {
  private service = inject(NotificationService);
  private router = inject(Router);
  loading = signal(true);
  items = signal<Notification[]>([]);
  ngOnInit(): void { this.load(); }
  load(): void { this.service.list({ limit: 50 }).subscribe((r) => { this.items.set(r.items); this.loading.set(false); }); }

  open(n: Notification): void {
    if (!n.isRead) {
      this.setRead(n._id, true);
      this.service.markRead(n._id).subscribe({ error: () => this.setRead(n._id, false) });
    }
    const bookId = n.metadata?.bookId;
    if (bookId) this.router.navigate(['/books', bookId]);
  }

  markAll(): void {
    this.items.update((list) => list.map((n) => ({ ...n, isRead: true })));
    this.service.markAllRead().subscribe({ error: () => this.load() });
  }

  private setRead(id: string, isRead: boolean): void {
    this.items.update((list) => list.map((n) => (n._id === id ? { ...n, isRead } : n)));
  }
}

@Component({
  selector: 'app-recommendations-page',
  standalone: true,
  imports: [CommonModule, BookCardComponent, SpinnerComponent, EmptyStateComponent],
  template: `
    <h2 class="mb-4">Recommended For You</h2>
    @if (loading()) { <app-spinner /> } @else if (!books().length) { <app-empty-state message="Read and like books to get recommendations" /> }
    @else {
      <div class="row g-3">@for (b of books(); track b._id) { <div class="col-md-3"><app-book-card [book]="b" /></div> }</div>
    }
  `,
})
export class RecommendationsPageComponent implements OnInit {
  private service = inject(RecommendationService);
  loading = signal(true);
  books = signal<Book[]>([]);
  ngOnInit(): void { this.service.list({ limit: 12 }).subscribe((r) => { this.books.set(r.items); this.loading.set(false); }); }
}

