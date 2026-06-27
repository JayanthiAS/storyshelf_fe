import { PlanInterval } from './enums.model';

export interface SubscriptionPlan {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency: string;
  interval: PlanInterval;
  features: string[];
  isDefault: boolean;
  isActive: boolean;
  unlocksLockedBooks: boolean;
  stripePriceId?: string;
}

export interface CreatePlanDto {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  interval: PlanInterval;
  features: string[];
  unlocksLockedBooks: boolean;
  isDefault?: boolean;
}
