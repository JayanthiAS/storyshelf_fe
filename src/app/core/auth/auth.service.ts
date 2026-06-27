import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { Observable, tap, catchError, of, firstValueFrom } from 'rxjs';
import { ApiService } from '../http/api.service';
import {
  AuthResponse,
  ForgotPasswordDto,
  JwtPayload,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  User,
  VerifyOtpDto,
} from '../models/user.model';
import { Role } from '../models/enums.model';
import { environment } from '../../../environments/environment';

const REFRESH_KEY = 'storyshelf_refresh_token';
const PENDING_EMAIL_KEY = 'storyshelf_pending_email';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private accessToken = signal<string | null>(null);
  private refreshTokenValue = signal<string | null>(null);
  currentUser = signal<User | null>(null);

  isAuthenticated = computed(() => !!this.accessToken());
  isAdmin = computed(() => this.currentUser()?.role === Role.Admin);
  isEmailVerified = computed(() => this.currentUser()?.isEmailVerified ?? false);

  getAccessToken(): string | null {
    return this.accessToken();
  }

  getRefreshToken(): string | null {
    return this.refreshTokenValue();
  }

  setSession(response: AuthResponse): void {
    this.accessToken.set(response.accessToken);
    this.refreshTokenValue.set(response.refreshToken);
    this.currentUser.set(response.user);
    sessionStorage.setItem(REFRESH_KEY, response.refreshToken);
    this.scheduleRefresh(response.accessToken);
  }

  clearSession(): void {
    this.accessToken.set(null);
    this.refreshTokenValue.set(null);
    this.currentUser.set(null);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(PENDING_EMAIL_KEY);
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
  }

  private refreshTimer?: ReturnType<typeof setTimeout>;

  private scheduleRefresh(token: string): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const expiresAt = decoded.exp * 1000;
      const refreshAt = expiresAt - environment.tokenRefreshSkewMs;
      const delay = Math.max(refreshAt - Date.now(), 0);
      this.refreshTimer = setTimeout(() => this.refresh().subscribe(), delay);
    } catch {
      /* ignore decode errors */
    }
  }

  initFromStorage(): Promise<void> {
    const stored = sessionStorage.getItem(REFRESH_KEY);
    if (!stored) return Promise.resolve();
    this.refreshTokenValue.set(stored);
    return firstValueFrom(this.refresh()).then(() => undefined).catch(() => {
      this.clearSession();
    });
  }

  login(dto: LoginDto): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/login', dto).pipe(tap((r) => this.setSession(r)));
  }

  adminLogin(dto: LoginDto): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/admin/login', dto).pipe(
      tap((r) => {
        if (r.user.role !== Role.Admin) throw new Error('Insufficient privileges');
        this.setSession(r);
      }),
    );
  }

  register(dto: RegisterDto): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/register', dto).pipe(
      tap((r) => {
        this.setSession(r);
        sessionStorage.setItem(PENDING_EMAIL_KEY, dto.email);
      }),
    );
  }

  verifyOtp(dto: VerifyOtpDto): Observable<{ verified: boolean }> {
    return this.api.post<{ verified: boolean }>('/auth/verify-otp', dto).pipe(
      tap(() => {
        sessionStorage.removeItem(PENDING_EMAIL_KEY);
        const user = this.currentUser();
        if (user) this.currentUser.set({ ...user, isEmailVerified: true });
      }),
    );
  }

  resendOtp(email: string): Observable<void> {
    return this.api.post<void>('/auth/resend-otp', { email });
  }

  getPendingEmail(): string | null {
    return sessionStorage.getItem(PENDING_EMAIL_KEY);
  }

  forgotPassword(dto: ForgotPasswordDto): Observable<void> {
    return this.api.post<void>('/auth/forgot-password', dto);
  }

  resetPassword(dto: ResetPasswordDto): Observable<void> {
    return this.api.post<void>('/auth/reset-password', dto);
  }

  refresh(): Observable<AuthResponse> {
    const token = this.refreshTokenValue() ?? sessionStorage.getItem(REFRESH_KEY);
    if (!token) return of(null as unknown as AuthResponse);
    return this.api.post<AuthResponse>('/auth/refresh', { refreshToken: token }).pipe(
      tap((r) => this.setSession(r)),
      catchError(() => {
        this.clearSession();
        throw new Error('Session expired');
      }),
    );
  }

  logout(): Observable<void> {
    const req = this.accessToken()
      ? this.api.post<void>('/auth/logout').pipe(catchError(() => of(undefined)))
      : of(undefined);
    return req.pipe(tap(() => {
      this.clearSession();
      this.router.navigate(['/login']);
    }));
  }

  fetchMe(): Observable<User> {
    return this.api.get<User>('/auth/me').pipe(tap((u) => this.currentUser.set(u)));
  }
}
