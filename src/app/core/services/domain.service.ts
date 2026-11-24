import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { ApiService } from '../http/api.service';
import { PaginatedData, QueryParams } from '../models/api.model';
import { Book } from '../models/book.model';
import {
  BroadcastNotificationDto,
  AnalyticsGranularity,
  CreateNotificationDto,
  DashboardAnalytics,
  DashboardStats,
  Notification,
  ReadingProgress,
  ReadingSessionDto,
  RecentActivity,
} from '../models/notification.model';
import { UpdateProfileDto, User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiService);

  getMe(): Observable<User> {
    return this.api.get<User>('/users/me');
  }

  updateMe(dto: UpdateProfileDto): Observable<User> {
    return this.api.patch<User>('/users/me', dto);
  }

  deleteMe(): Observable<void> {
    return this.api.delete<void>('/users/me');
  }

  getLikes(params?: QueryParams): Observable<PaginatedData<Book>> {
    return this.api.getPaginated<Book>('/users/me/likes', params);
  }

  likeBook(bookId: string): Observable<void> {
    return this.api.post<void>(`/users/me/likes/${bookId}`, {});
  }

  unlikeBook(bookId: string): Observable<void> {
    return this.api.delete<void>(`/users/me/likes/${bookId}`);
  }
}

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private readonly api = inject(ApiService);

  list(params?: QueryParams): Observable<PaginatedData<User>> {
    return this.api.getPaginated<User>('/admin/users', params);
  }

  listDeleted(params?: QueryParams): Observable<PaginatedData<User>> {
    return this.api.getPaginated<User>('/admin/users/deleted', params);
  }

  getById(id: string): Observable<User> {
    return this.api.get<User>(`/admin/users/${id}`);
  }

  create(dto: Partial<User> & { password?: string }): Observable<User> {
    return this.api.post<User>('/admin/users', dto);
  }

  update(id: string, dto: Partial<User>): Observable<User> {
    return this.api.patch<User>(`/admin/users/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/admin/users/${id}`);
  }

  restore(id: string): Observable<User> {
    return this.api.patch<User>(`/admin/users/${id}/restore`, {});
  }

  activate(id: string, isActive: boolean): Observable<User> {
    return this.api.patch<User>(`/admin/users/${id}/activate`, { isActive });
  }

  getSubscription(id: string): Observable<unknown> {
    return this.api.get(`/admin/users/${id}/subscription`);
  }
}

@Injectable({ providedIn: 'root' })
export class ReadingService {
  private readonly api = inject(ApiService);

  getProgress(): Observable<ReadingProgress[]> {
    return this.api.get<ReadingProgress[]>('/reading/progress');
  }

  getBookProgress(bookId: string): Observable<ReadingProgress> {
    return this.api.get<ReadingProgress>(`/reading/progress/${bookId}`);
  }

  saveProgress(bookId: string, data: { currentPage: number; totalPages: number }): Observable<ReadingProgress> {
    return this.api.put<ReadingProgress>(`/reading/progress/${bookId}`, data);
  }

  logSession(dto: ReadingSessionDto): Observable<{ _id: string }> {
    return this.api.post<{ _id: string }>('/reading/sessions', dto);
  }

  updateSession(id: string, dto: { durationSeconds: number; endedAt: string }): Observable<{ _id: string }> {
    return this.api.patch<{ _id: string }>(`/reading/sessions/${id}`, dto);
  }

  getHistory(params?: QueryParams): Observable<PaginatedData<Book>> {
    return this.api.getPaginated<Book>('/reading/history', params);
  }
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = inject(ApiService);
  readonly unreadCountState = signal(0);

  list(params?: QueryParams): Observable<PaginatedData<Notification>> {
    return this.api.getPaginated<Notification>('/notifications', params);
  }

  unreadCount(): Observable<{ count: number }> {
    return this.api
      .get<{ count: number }>('/notifications/unread-count')
      .pipe(tap((r) => this.unreadCountState.set(r.count)));
  }

  getById(id: string): Observable<Notification> {
    return this.api.get<Notification>(`/notifications/${id}`);
  }

  markRead(id: string): Observable<Notification> {
    return this.api
      .patch<Notification>(`/notifications/${id}/read`, {})
      .pipe(tap(() => this.unreadCountState.update((c) => Math.max(0, c - 1))));
  }

  markAllRead(): Observable<void> {
    return this.api
      .patch<void>('/notifications/read-all', {})
      .pipe(tap(() => this.unreadCountState.set(0)));
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/notifications/${id}`);
  }

  adminList(params?: QueryParams): Observable<PaginatedData<Notification>> {
    return this.api.getPaginated<Notification>('/admin/notifications', params);
  }

  broadcast(dto: BroadcastNotificationDto): Observable<void> {
    return this.api.post<void>('/admin/notifications/broadcast', dto);
  }

  create(dto: CreateNotificationDto): Observable<Notification> {
    return this.api.post<Notification>('/admin/notifications', dto);
  }
}

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private readonly api = inject(ApiService);

  list(params?: QueryParams): Observable<PaginatedData<Book>> {
    return this.api.getPaginated<Book>('/recommendations', params);
  }

  byGenre(genreId: string, params?: QueryParams): Observable<PaginatedData<Book>> {
    return this.api.getPaginated<Book>(`/recommendations/by-genre/${genreId}`, params);
  }

  byAuthor(authorId: string, params?: QueryParams): Observable<PaginatedData<Book>> {
    return this.api.getPaginated<Book>(`/recommendations/by-author/${authorId}`, params);
  }

  similar(bookId: string, params?: QueryParams): Observable<PaginatedData<Book>> {
    return this.api.getPaginated<Book>(`/recommendations/similar/${bookId}`, params);
  }
}

export interface SearchSuggestion {
  id: string;
  title: string;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly api = inject(ApiService);

  searchBooks(q: string, params?: QueryParams): Observable<PaginatedData<Book>> {
    return this.api.getPaginated<Book>('/search/books', { ...params, q });
  }

  suggest(q: string): Observable<SearchSuggestion[]> {
    return this.api
      .get<SearchSuggestion[] | { data?: Array<SearchSuggestion | string> } | Array<SearchSuggestion | string>>(
        '/search/suggest',
        { q },
      )
      .pipe(map((payload) => normalizeSuggestions(payload)));
  }
}

function normalizeSuggestions(
  payload: SearchSuggestion[] | { data?: Array<SearchSuggestion | string> } | Array<SearchSuggestion | string> | null,
): SearchSuggestion[] {
  const list = Array.isArray(payload) ? payload : payload?.data ?? [];
  return list
    .map((item) => {
      if (typeof item === 'string') return { id: item, title: item };
      if (item && typeof item.title === 'string') return { id: item.id || item.title, title: item.title };
      return null;
    })
    .filter((item): item is SearchSuggestion => item !== null);
}

@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly api = inject(ApiService);

  getStats(): Observable<DashboardStats> {
    return this.api.get<DashboardStats>('/admin/dashboard/stats');
  }

  getRecentActivity(): Observable<RecentActivity[]> {
    return this.api.get<RecentActivity[]>('/admin/dashboard/recent-activity');
  }

  getAnalytics(granularity: AnalyticsGranularity): Observable<DashboardAnalytics> {
    return this.api.get<DashboardAnalytics>('/admin/dashboard/analytics', { granularity });
  }

  exportAnalytics(granularity: AnalyticsGranularity): Observable<Blob> {
    return this.api.getBlob(`/admin/dashboard/analytics/export?granularity=${granularity}`);
  }
}
