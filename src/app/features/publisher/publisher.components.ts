import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthShellComponent } from '../../layouts/layouts.component';
import { AuthService } from '../../core/auth/auth.service';
import { PublisherService } from '../../core/services/publisher.service';
import { PublisherInvitePreview, PublisherSession } from '../../core/models/publisher.model';
import { GuruCardComponent, SpinnerComponent } from '../../shared/layout/layout.components';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-publisher-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AuthShellComponent, RouterLink],
  template: `
    <app-auth-shell>
      <h3 class="text-c-blue mb-1">Publisher sign in</h3>
      <p class="text-muted small mb-3">For publishing houses invited by Storyshelf.</p>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="mb-3">
          <label class="form-label">Work email</label>
          <input type="email" class="form-control" formControlName="email" />
        </div>
        <div class="mb-3">
          <label class="form-label">Password</label>
          <input type="password" class="form-control" formControlName="password" />
        </div>
        @if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
        <button class="btn btn-primary w-100" [disabled]="loading() || form.invalid">Sign in</button>
      </form>
      <div class="mt-3 text-center">
        <a routerLink="/publisher/forgot-password">Forgot password?</a>
      </div>
    </app-auth-shell>
  `,
})
export class PublisherLoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  loading = signal(false);
  error = signal('');
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    this.auth.publisherLogin({
      email: value.email!.trim().toLowerCase(),
      password: value.password!,
    }).subscribe({
      next: () => this.router.navigate(['/publisher']),
      error: (e) => {
        this.error.set(e.error?.message || 'Publisher access required');
        this.loading.set(false);
      },
    });
  }
}

@Component({
  selector: 'app-publisher-accept-invite',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AuthShellComponent, RouterLink, SpinnerComponent],
  template: `
    <app-auth-shell>
      <h3 class="text-c-blue mb-3">Join {{ preview()?.displayName || 'your house' }}</h3>
      @if (loadingPreview()) {
        <app-spinner />
      } @else if (preview()) {
        <p class="text-muted small">{{ preview()!.email }} · {{ preview()!.legalName }}</p>
        <div class="border rounded p-3 mb-3 small" style="max-height: 180px; overflow: auto">
          {{ preview()!.termsText }}
        </div>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="mb-3">
            <label class="form-label">Password</label>
            <input type="password" class="form-control" formControlName="password" />
            <div class="form-text">At least 8 characters.</div>
          </div>
          <div class="form-check mb-3">
            <input class="form-check-input" type="checkbox" id="acceptTerms" formControlName="acceptTerms" />
            <label class="form-check-label" for="acceptTerms">
              I accept the complimentary hosting terms ({{ preview()!.termsVersion }}). Storyshelf will not charge or pay this house until a later agreement.
            </label>
          </div>
          @if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
          <button class="btn btn-primary w-100" [disabled]="loading() || form.invalid">Create publisher login</button>
        </form>
      } @else {
        <div class="alert alert-warning">{{ error() || 'This invite is no longer valid.' }}</div>
        <a routerLink="/publisher/login">Back to publisher sign in</a>
      }
    </app-auth-shell>
  `,
})
export class PublisherAcceptInviteComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private publishers = inject(PublisherService);
  loadingPreview = signal(true);
  loading = signal(false);
  error = signal('');
  preview = signal<PublisherInvitePreview | null>(null);
  private token = '';
  form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    acceptTerms: [false, Validators.requiredTrue],
  });

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.loadingPreview.set(false);
      this.error.set('This invite link is missing a token. Ask Storyshelf for a new link.');
      return;
    }
    this.publishers.previewInvite(this.token).subscribe({
      next: (preview) => {
        this.preview.set(preview);
        this.loadingPreview.set(false);
      },
      error: (e) => {
        this.error.set(e.error?.message || 'This invite is no longer valid. Ask Storyshelf for a new link.');
        this.loadingPreview.set(false);
      },
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    this.auth.acceptPublisherInvite({
      token: this.token,
      password: this.form.controls.password.value!,
      acceptTerms: true,
    }).subscribe({
      next: () => this.router.navigate(['/publisher']),
      error: (e) => {
        this.error.set(e.error?.message || 'Could not accept this invite');
        this.loading.set(false);
      },
    });
  }
}

@Component({
  selector: 'app-publisher-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AuthShellComponent, RouterLink],
  template: `
    <app-auth-shell>
      <h3 class="text-c-blue mb-3">Reset publisher password</h3>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="mb-3">
          <label class="form-label">Work email</label>
          <input type="email" class="form-control" formControlName="email" />
        </div>
        @if (sent()) { <div class="alert alert-success">If the account exists, a reset code has been sent.</div> }
        <button class="btn btn-primary w-100" [disabled]="form.invalid">Send reset code</button>
      </form>
      <div class="mt-3 text-center">
        <a routerLink="/publisher/reset-password">Have a code?</a>
        · <a routerLink="/publisher/login">Back to sign in</a>
      </div>
    </app-auth-shell>
  `,
})
export class PublisherForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  sent = signal(false);
  form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });

  submit(): void {
    const email = this.form.controls.email.value!.trim().toLowerCase();
    this.auth.forgotPassword({ email }).subscribe(() => this.sent.set(true));
  }
}

@Component({
  selector: 'app-publisher-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AuthShellComponent, RouterLink],
  template: `
    <app-auth-shell>
      <h3 class="text-c-blue mb-3">Choose a new password</h3>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="mb-3"><label class="form-label">Work email</label><input type="email" class="form-control" formControlName="email" /></div>
        <div class="mb-3"><label class="form-label">Reset code</label><input class="form-control" formControlName="code" /></div>
        <div class="mb-3"><label class="form-label">New password</label><input type="password" class="form-control" formControlName="newPassword" /></div>
        @if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
        <button class="btn btn-primary w-100" [disabled]="loading() || form.invalid">Reset password</button>
      </form>
      <div class="mt-3 text-center"><a routerLink="/publisher/login">Back to sign in</a></div>
    </app-auth-shell>
  `,
})
export class PublisherResetPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  loading = signal(false);
  error = signal('');
  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    code: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    this.loading.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    this.auth.resetPassword({
      email: value.email!.trim().toLowerCase(),
      code: value.code!,
      newPassword: value.newPassword!,
    }).subscribe({
      next: () => {
        this.toast.success('Password reset');
        this.router.navigate(['/publisher/login']);
      },
      error: (e) => {
        this.error.set(e.error?.message || 'Could not reset password');
        this.loading.set(false);
      },
    });
  }
}

@Component({
  selector: 'app-publisher-home',
  standalone: true,
  imports: [CommonModule, RouterLink, GuruCardComponent, SpinnerComponent],
  template: `
    @if (loading()) { <app-spinner /> } @else if (session()) {
      <h2 class="mb-1">{{ session()!.organization?.displayName || 'Publisher home' }}</h2>
      <p class="text-muted">Readers cannot see your books until Storyshelf approves them. Book upload is the next step.</p>
      @if (session()!.organization?.status === 'suspended') {
        <div class="alert alert-warning">This house is suspended. You can sign in, and changes stay paused until Storyshelf reactivates it.</div>
      }
      @if (!session()!.organization) {
        <div class="alert alert-warning">Your access to this house has been removed. Contact Storyshelf.</div>
      }
      <div class="row g-3">
        <div class="col-md-4">
          <app-guru-card title="Terms">
            <p class="mb-1">{{ session()!.checklist.termsAccepted ? 'Accepted' : 'Not accepted yet' }}</p>
            <p class="text-muted small mb-0">Complimentary hosting. No charge and no payout in this phase.</p>
          </app-guru-card>
        </div>
        <div class="col-md-4">
          <app-guru-card title="House profile">
            <p class="mb-2">{{ session()!.checklist.profileReady ? 'Website added' : 'Add a website so readers know the house.' }}</p>
            <a routerLink="/publisher/settings" class="btn btn-sm btn-outline-primary">House settings</a>
          </app-guru-card>
        </div>
        <div class="col-md-4">
          <app-guru-card title="First book">
            <p class="mb-0 text-muted">Upload arrives in the next release. Your login and house record are ready.</p>
          </app-guru-card>
        </div>
      </div>
    }
  `,
})
export class PublisherHomeComponent implements OnInit {
  private publishers = inject(PublisherService);
  loading = signal(true);
  session = signal<PublisherSession | null>(null);

  ngOnInit(): void {
    this.publishers.me().subscribe({
      next: (session) => {
        this.session.set(session);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}

@Component({
  selector: 'app-publisher-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, GuruCardComponent, SpinnerComponent],
  template: `
    @if (loading()) { <app-spinner /> } @else if (session()) {
      <h2 class="mb-4">House settings</h2>
      @if (session()!.organization?.status === 'suspended') {
        <div class="alert alert-warning">This house is suspended. Profile changes are paused.</div>
      }
      <app-guru-card title="Profile">
        <form [formGroup]="form" (ngSubmit)="save()">
          <div class="mb-3">
            <label class="form-label">Legal name</label>
            <input class="form-control" [value]="session()!.organization?.legalName || ''" disabled />
          </div>
          <div class="mb-3">
            <label class="form-label">Display name</label>
            <input class="form-control" formControlName="displayName" />
          </div>
          <div class="mb-3">
            <label class="form-label">Country</label>
            <input class="form-control" formControlName="country" />
          </div>
          <div class="mb-3">
            <label class="form-label">Website</label>
            <input class="form-control" formControlName="website" placeholder="https://" />
          </div>
          @if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
          <button class="btn btn-primary" [disabled]="saving() || form.invalid || session()!.membership?.orgRole !== 'owner' || session()!.organization?.status === 'suspended'">
            Save
          </button>
          @if (session()!.membership?.orgRole !== 'owner') {
            <p class="text-muted small mt-2 mb-0">Only the house owner can change these details.</p>
          }
        </form>
      </app-guru-card>
      <app-guru-card title="Complimentary terms">
        <p class="small mb-2">{{ session()!.agreement?.termsText }}</p>
        <p class="text-muted small mb-0">
          Version {{ session()!.agreement?.termsVersion || 'complimentary-v1' }}.
          @if (session()!.agreement?.acceptedAt) {
            Accepted {{ session()!.agreement!.acceptedAt | date:'medium' }}.
          }
        </p>
      </app-guru-card>
    }
  `,
})
export class PublisherSettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private publishers = inject(PublisherService);
  private toast = inject(ToastService);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  session = signal<PublisherSession | null>(null);
  form = this.fb.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    country: ['', Validators.required],
    website: [''],
  });

  ngOnInit(): void {
    this.publishers.me().subscribe({
      next: (session) => {
        this.session.set(session);
        this.form.patchValue({
          displayName: session.organization?.displayName || '',
          country: session.organization?.country || '',
          website: session.organization?.website || '',
        });
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    const body: { displayName: string; country: string; website?: string } = {
      displayName: value.displayName!.trim(),
      country: value.country!.trim(),
    };
    const website = value.website?.trim();
    if (website) body.website = website;
    this.publishers.updateOrganization(body).subscribe({
      next: (session) => {
        this.session.set(session);
        this.saving.set(false);
        this.toast.success('House profile saved');
      },
      error: (e) => {
        this.error.set(e.error?.message || 'Could not save the house profile');
        this.saving.set(false);
      },
    });
  }
}
