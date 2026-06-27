import { SubscriptionStatus } from './enums.model';
import { SubscriptionPlan } from './subscription-plan.model';

export interface PopulatedUserRef {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface Subscription {
  _id: string;
  userId: string | PopulatedUserRef;
  planId: string | SubscriptionPlan;
  status: SubscriptionStatus;
  stripeSubscriptionId?: string;
  currentPeriodStart: string;
  currentPeriodEnd?: string;
  cancelledAt?: string;
}

export interface SubscriptionMeResponse {
  subscription: Subscription;
  plan: SubscriptionPlan;
}

export interface CheckoutResponse {
  url: string;
  sessionId?: string;
}

export interface PortalResponse {
  url: string;
}
