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
const GUEST_KEY = 'storyshelf_guest_token';
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
  isPublisher = computed(() => this.currentUser()?.role === Role.Publisher);
  isGuest = computed(() => this.currentUser()?.role === Role.Guest);
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
    if (response.user) this.currentUser.set(response.user);
    sessionStorage.setItem(REFRESH_KEY, response.refreshToken);
    this.scheduleRefresh(response.accessToken);
  }

  clearSession(): void {
    this.accessToken.set(null);
    this.refreshTokenValue.set(null);
    this.currentUser.set(null);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(GUEST_KEY);
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
    const guestToken = sessionStorage.getItem(GUEST_KEY);
    if (guestToken && this.restoreGuestToken(guestToken)) {
      return Promise.resolve();
    }
    sessionStorage.removeItem(GUEST_KEY);
    const stored = sessionStorage.getItem(REFRESH_KEY);
    if (!stored) return Promise.resolve();
    this.refreshTokenValue.set(stored);
    return firstValueFrom(this.refresh()).then(() => undefined).catch(() => {
      this.clearSession();
    });
  }

  loginAsGuest(): Observable<{ accessToken: string }> {
    return this.api.post<{ accessToken: string }>('/auth/guest', {}).pipe(
      tap((response) => this.applyGuestToken(response.accessToken)),
    );
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

  publisherLogin(dto: LoginDto): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/publisher/login', dto).pipe(
      tap((r) => {
        if (r.user.role !== Role.Publisher) throw new Error('Publisher access required');
        this.setSession(r);
      }),
    );
  }

  acceptPublisherInvite(body: {
    token: string;
    password: string;
    acceptTerms: boolean;
  }): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/publisher/accept-invite', body).pipe(
      tap((r) => this.setSession(r)),
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
      const destination = this.isPublisher() ? '/publisher/login' : '/login';
      this.clearSession();
      this.router.navigate([destination]);
    }));
  }

  fetchMe(): Observable<User> {
    return this.api.get<User>('/auth/me').pipe(tap((u) => this.currentUser.set(u)));
  }

  private restoreGuestToken(token: string): boolean {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      if (decoded.role !== Role.Guest || decoded.exp * 1000 <= Date.now()) return false;
      this.applyGuestToken(token);
      return true;
    } catch {
      return false;
    }
  }

  private applyGuestToken(token: string): void {
    const decoded = jwtDecode<JwtPayload>(token);
    this.accessToken.set(token);
    this.refreshTokenValue.set(null);
    sessionStorage.removeItem(REFRESH_KEY);
    sessionStorage.setItem(GUEST_KEY, token);
    this.currentUser.set({
      _id: decoded.sub,
      email: '',
      firstName: '',
      lastName: '',
      role: Role.Guest,
      isSuperAdmin: false,
      isEmailVerified: false,
      isActive: true,
      createdAt: '',
      updatedAt: '',
    });
  }
}
