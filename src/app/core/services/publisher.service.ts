import { Injectable, inject } from '@angular/core';
import { ApiService } from '../http/api.service';
import {
  CreatePublisherHouseDto,
  CreatePublisherHouseResult,
  PublisherAuthor,
  PublisherBook,
  PublisherHouse,
  PublisherInvitePreview,
  PublisherSession,
} from '../models/publisher.model';

@Injectable({ providedIn: 'root' })
export class PublisherService {
  private readonly api = inject(ApiService);

  previewInvite(token: string) {
    return this.api.get<PublisherInvitePreview>('/auth/publisher/invite', { token });
  }

  me() {
    return this.api.get<PublisherSession>('/publisher/me');
  }

  updateOrganization(body: { displayName?: string; country?: string; website?: string }) {
    return this.api.patch<PublisherSession>('/publisher/organization', body);
  }
}

@Injectable({ providedIn: 'root' })
export class AdminPublisherService {
  private readonly api = inject(ApiService);

  list(page = 1) {
    return this.api.getPaginated<PublisherHouse>('/admin/publishers', { page, limit: 20 });
  }

  create(body: CreatePublisherHouseDto) {
    return this.api.post<CreatePublisherHouseResult>('/admin/publishers', body);
  }

  resend(id: string) {
    return this.api.post<{ inviteUrl: string; expiresAt: string; email: string }>(
      `/admin/publishers/${id}/invites/resend`,
    );
  }

  suspend(id: string) {
    return this.api.post<PublisherHouse>(`/admin/publishers/${id}/suspend`);
  }

  reactivate(id: string) {
    return this.api.post<PublisherHouse>(`/admin/publishers/${id}/reactivate`);
  }
}

@Injectable({ providedIn: 'root' })
export class PublisherBookService {
  private readonly api = inject(ApiService);

  list() {
    return this.api.get<PublisherBook[]>('/publisher/books');
  }

  get(id: string) {
    return this.api.get<PublisherBook>(`/publisher/books/${id}`);
  }

  create(body: Record<string, unknown>) {
    return this.api.post<PublisherBook>('/publisher/books', body);
  }

  update(id: string, body: Record<string, unknown>) {
    return this.api.patch<PublisherBook>(`/publisher/books/${id}`, body);
  }

  uploadFile(id: string, file: File) {
    const data = new FormData();
    data.append('file', file);
    return this.api.upload<PublisherBook>(`/publisher/books/${id}/file`, data);
  }

  uploadCover(id: string, file: File) {
    const data = new FormData();
    data.append('cover', file);
    return this.api.upload<PublisherBook>(`/publisher/books/${id}/cover`, data);
  }

  submit(id: string) {
    return this.api.post<PublisherBook>(`/publisher/books/${id}/submit`, {});
  }

  withdraw(id: string) {
    return this.api.post<PublisherBook>(`/publisher/books/${id}/withdraw`, {});
  }

  requestTakedown(id: string) {
    return this.api.post<PublisherBook>(`/publisher/books/${id}/takedown-request`, {});
  }

  authors() {
    return this.api.get<PublisherAuthor[]>('/publisher/authors');
  }

  reviews() {
    return this.api.get<PublisherBook[]>('/admin/publisher-reviews');
  }

  approve(id: string) {
    return this.api.post<PublisherBook>(`/admin/publisher-reviews/${id}/approve`, {});
  }

  requestChanges(id: string, note: string) {
    return this.api.post<PublisherBook>(`/admin/publisher-reviews/${id}/changes`, { note });
  }

  reject(id: string, note: string) {
    return this.api.post<PublisherBook>(`/admin/publisher-reviews/${id}/reject`, { note });
  }

  confirmTakedown(id: string) {
    return this.api.post<PublisherBook>(`/admin/publisher-reviews/${id}/takedown`, {});
  }
}

