import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthShellComponent } from '../../layouts/layouts.component';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AuthShellComponent, RouterLink],
  template: `
    <app-auth-shell>
      <h3 class="text-c-blue mb-3">Sign In</h3>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="mb-3">
          <label class="form-label">Email</label>
          <input type="email" class="form-control" formControlName="email" />
        </div>
        <div class="mb-3">
          <label class="form-label">Password</label>
          <input type="password" class="form-control" formControlName="password" />
        </div>
        @if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
        <button class="btn btn-primary w-100" [disabled]="loading() || form.invalid">Sign In</button>
      </form>
      <div class="mt-3 text-center">
        <a routerLink="/forgot-password">Forgot password?</a> · <a routerLink="/register">Create account</a>
      </div>
    </app-auth-shell>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
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
    this.auth.login(this.form.getRawValue() as { email: string; password: string }).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        this.router.navigateByUrl(returnUrl);
      },
      error: (e) => {
        this.error.set(e.error?.message || 'Invalid credentials');
        this.loading.set(false);
      },
    });
  }
}

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AuthShellComponent],
  template: `
    <app-auth-shell>
      <h3 class="text-c-blue mb-3">Admin Sign In</h3>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="mb-3"><label class="form-label">Email</label><input type="email" class="form-control" formControlName="email" /></div>
        <div class="mb-3"><label class="form-label">Password</label><input type="password" class="form-control" formControlName="password" /></div>
        @if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
        <button class="btn btn-primary w-100" [disabled]="loading()">Sign In</button>
      </form>
    </app-auth-shell>
  `,
})
export class AdminLoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  loading = signal(false);
  error = signal('');
  form = this.fb.group({ email: ['', Validators.required], password: ['', Validators.required] });

  submit(): void {
    this.loading.set(true);
    this.auth.adminLogin(this.form.getRawValue() as { email: string; password: string }).subscribe({
      next: () => this.router.navigate(['/admin']),
      error: (e) => { this.error.set(e.error?.message || 'Access denied'); this.loading.set(false); },
    });
  }
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AuthShellComponent, RouterLink],
  template: `
    <app-auth-shell>
      <h3 class="text-c-blue mb-3">Create Account</h3>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="row">
          <div class="col-md-6 mb-3"><label class="form-label">First Name</label><input class="form-control" formControlName="firstName" /></div>
          <div class="col-md-6 mb-3"><label class="form-label">Last Name</label><input class="form-control" formControlName="lastName" /></div>
        </div>
        <div class="mb-3"><label class="form-label">Email</label><input type="email" class="form-control" formControlName="email" /></div>
        <div class="mb-3"><label class="form-label">Password</label><input type="password" class="form-control" formControlName="password" /></div>
        @if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
        <button class="btn btn-primary w-100" [disabled]="loading()">Register</button>
      </form>
      <div class="mt-3 text-center"><a routerLink="/login">Already have an account?</a></div>
    </app-auth-shell>
  `,
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  loading = signal(false);
  error = signal('');
  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  submit(): void {
    this.loading.set(true);
    this.auth.register(this.form.getRawValue() as never).subscribe({
      next: () => this.router.navigate(['/verify-email']),
      error: (e) => { this.error.set(e.error?.message || 'Registration failed'); this.loading.set(false); },
    });
  }
}

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AuthShellComponent],
  template: `
    <app-auth-shell>
      <h3 class="text-c-blue mb-3">Verify Email</h3>
      <p class="text-muted">Enter the 6-digit code sent to {{ email }}</p>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="mb-3"><input class="form-control text-center fs-4" formControlName="code" maxlength="6" placeholder="123456" /></div>
        @if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
        <button class="btn btn-primary w-100" [disabled]="loading()">Verify</button>
      </form>
      <button class="btn btn-link w-100 mt-2" [disabled]="cooldown() > 0" (click)="resend()">
        Resend OTP {{ cooldown() > 0 ? '(' + cooldown() + 's)' : '' }}
      </button>
    </app-auth-shell>
  `,
})
export class VerifyEmailComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  loading = signal(false);
  error = signal('');
  cooldown = signal(0);
  form = this.fb.group({ code: ['', Validators.required] });

  get email(): string {
    return this.auth.getPendingEmail() || this.auth.currentUser()?.email || '';
  }

  ngOnInit(): void {
    if (this.auth.isAuthenticated() && !this.auth.currentUser()) {
      this.auth.fetchMe().subscribe();
    }
  }

  submit(): void {
    this.loading.set(true);
    this.auth.verifyOtp({ email: this.email, code: this.form.value.code! }).subscribe({
      next: () => { this.toast.success('Email verified!'); this.router.navigate(['/']); },
      error: (e) => { this.error.set(e.error?.message || 'Invalid OTP'); this.loading.set(false); },
    });
  }

  resend(): void {
    this.auth.resendOtp(this.email).subscribe({
      next: () => {
        this.toast.info('OTP sent');
        this.cooldown.set(environment.otpResendCooldownSec);
        const interval = setInterval(() => {
          this.cooldown.update((c) => c - 1);
          if (this.cooldown() <= 0) clearInterval(interval);
        }, 1000);
      },
    });
  }
}

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AuthShellComponent, RouterLink],
  template: `
    <app-auth-shell>
      <h3 class="text-c-blue mb-3">Forgot Password</h3>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="mb-3"><label class="form-label">Email</label><input type="email" class="form-control" formControlName="email" /></div>
        @if (sent()) { <div class="alert alert-success">Check your email for a reset code.</div> }
        <button class="btn btn-primary w-100">Send Reset Code</button>
      </form>
      <div class="mt-3 text-center"><a routerLink="/reset-password">Have a code?</a></div>
    </app-auth-shell>
  `,
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  sent = signal(false);
  form = this.fb.group({ email: ['', Validators.required] });

  submit(): void {
    this.auth.forgotPassword(this.form.getRawValue() as { email: string }).subscribe(() => this.sent.set(true));
  }
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AuthShellComponent, RouterLink],
  template: `
    <app-auth-shell>
      <h3 class="text-c-blue mb-3">Reset Password</h3>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="mb-3"><label class="form-label">Email</label><input type="email" class="form-control" formControlName="email" /></div>
        <div class="mb-3"><label class="form-label">OTP Code</label><input class="form-control" formControlName="code" /></div>
        <div class="mb-3"><label class="form-label">New Password</label><input type="password" class="form-control" formControlName="newPassword" /></div>
        <button class="btn btn-primary w-100">Reset Password</button>
      </form>
      <div class="mt-3 text-center"><a routerLink="/login">Back to login</a></div>
    </app-auth-shell>
  `,
})
export class ResetPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  form = this.fb.group({
    email: ['', Validators.required],
    code: ['', Validators.required],
    newPassword: ['', Validators.minLength(6)],
  });

  submit(): void {
    this.auth.resetPassword(this.form.getRawValue() as never).subscribe({
      next: () => { this.toast.success('Password reset'); this.router.navigate(['/login']); },
    });
  }
}
