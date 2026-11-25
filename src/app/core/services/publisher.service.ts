import { Injectable, inject } from '@angular/core';
import { ApiService } from '../http/api.service';
import {
  CreatePublisherHouseDto,
  CreatePublisherHouseResult,
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
