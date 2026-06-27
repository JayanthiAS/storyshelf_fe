import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../http/api.service';
import { PaginatedData, QueryParams } from '../models/api.model';
import { CreatePlanDto, SubscriptionPlan } from '../models/subscription-plan.model';
import {
  CheckoutResponse,
  PortalResponse,
  Subscription,
  SubscriptionMeResponse,
} from '../models/subscription.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly api = inject(ApiService);

  getPlans(params?: QueryParams): Observable<PaginatedData<SubscriptionPlan>> {
    return this.api.getPaginated<SubscriptionPlan>('/subscription-plans', params);
  }

  getPlan(id: string): Observable<SubscriptionPlan> {
    return this.api.get<SubscriptionPlan>(`/subscription-plans/${id}`);
  }

  confirmCheckout(sessionId: string): Observable<SubscriptionMeResponse> {
    return this.api.get<SubscriptionMeResponse>('/subscriptions/checkout/success', {
      session_id: sessionId,
    });
  }

  getMySubscription(): Observable<SubscriptionMeResponse> {
    return this.api.get<SubscriptionMeResponse>('/subscriptions/me');
  }

  checkout(planId: string): Observable<CheckoutResponse> {
    return this.api.post<CheckoutResponse>('/subscriptions/checkout', { planId });
  }

  portal(): Observable<PortalResponse> {
    return this.api.post<PortalResponse>('/subscriptions/portal', {});
  }

  cancel(): Observable<Subscription> {
    return this.api.post<Subscription>('/subscriptions/cancel', {});
  }

  upgrade(planId: string): Observable<Subscription> {
    return this.api.post<Subscription>('/subscriptions/upgrade', { planId });
  }

  adminListPlans(params?: QueryParams): Observable<PaginatedData<SubscriptionPlan>> {
    return this.api.getPaginated<SubscriptionPlan>('/admin/subscription-plans', params);
  }

  adminCreatePlan(dto: CreatePlanDto): Observable<SubscriptionPlan> {
    return this.api.post<SubscriptionPlan>('/admin/subscription-plans', dto);
  }

  adminUpdatePlan(id: string, dto: Partial<CreatePlanDto>): Observable<SubscriptionPlan> {
    return this.api.patch<SubscriptionPlan>(`/admin/subscription-plans/${id}`, dto);
  }

  adminDeletePlan(id: string): Observable<void> {
    return this.api.delete<void>(`/admin/subscription-plans/${id}`);
  }

  adminListSubscriptions(params?: QueryParams): Observable<PaginatedData<Subscription>> {
    return this.api.getPaginated<Subscription>('/admin/subscriptions', params);
  }

  adminGetUserSubscription(userId: string): Observable<Subscription[]> {
    return this.api.get<Subscription[]>(`/admin/subscriptions/${userId}`);
  }
}
