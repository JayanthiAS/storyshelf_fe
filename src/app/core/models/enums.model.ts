export enum Role {
  User = 'user',
  Admin = 'admin',
  Guest = 'guest',
  Publisher = 'publisher',
}

export enum BookStatus {
  Draft = 'draft',
  Published = 'published',
}

export enum SubscriptionStatus {
  Active = 'active',
  Cancelled = 'cancelled',
  Expired = 'expired',
  PastDue = 'past_due',
  Trialing = 'trialing',
}

export enum PlanInterval {
  Month = 'month',
  Year = 'year',
  Lifetime = 'lifetime',
  Free = 'free',
}

export enum NotificationType {
  Recommendation = 'recommendation',
  System = 'system',
  Subscription = 'subscription',
  Release = 'release',
  Publisher = 'publisher',
}

export type ApiErrorCode =
  | 'BOOK_LOCKED'
  | 'BOOK_NOT_RELEASED'
  | 'OTP_INVALID'
  | 'SUBSCRIPTION_REQUIRED'
  | 'USER_DELETED'
  | 'BOOK_UNAVAILABLE'
  | 'FILE_INVALID'
  | 'FILE_TOO_LARGE'
  | 'FILE_TYPE'
  | 'SUBMIT_INCOMPLETE'
  | 'ORG_SUSPENDED'
  | 'TERMS_REQUIRED';
