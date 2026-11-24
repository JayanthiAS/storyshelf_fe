import { NotificationType } from './enums.model';

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: {
    bookId?: string;
    genreId?: string;
    authorId?: string;
    planId?: string;
  };
  isRead: boolean;
  createdAt: string;
}

export interface ReadingProgress {
  _id?: string;
  userId: string;
  bookId: string | { _id: string; title: string; coverImageUrl?: string };
  currentPage: number;
  totalPages: number;
  percentComplete: number;
  isCompleted?: boolean;
  completedAt?: string | null;
  lastReadAt: string;
}

export interface ReadingSessionDto {
  bookId: string;
  durationSeconds: number;
  startedAt: string;
  endedAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalBooks: number;
  activeSubscriptions: number;
  lockedBooks: number;
}

export type AnalyticsGranularity = 'day' | 'month' | 'year';

export interface AnalyticsPoint {
  period: string;
  readingUsers: number;
  loggedInUsers: number;
}

export interface AnalyticsTopBook {
  bookId: string;
  title: string;
  readers: number;
  sessions: number;
  minutes: number;
}

export interface AnalyticsComparison {
  current: number;
  previous: number;
  change: number;
}

export interface AnalyticsGenre {
  genreId: string;
  name: string;
  readers: number;
  sessions: number;
}

export interface DashboardAnalytics {
  granularity: AnalyticsGranularity;
  from: string;
  to: string;
  previousFrom: string;
  previousTo: string;
  totals: {
    readingUsers: number;
    loggedInUsers: number;
    newSignups: number;
    revenueCents: number;
    failedPayments: number;
    completionRate: number;
  };
  previousTotals: DashboardAnalytics['totals'];
  comparison: {
    readingUsers: AnalyticsComparison;
    loggedInUsers: AnalyticsComparison;
    newSignups: AnalyticsComparison;
    revenueCents: AnalyticsComparison;
    failedPayments: AnalyticsComparison;
    completionRate: AnalyticsComparison;
  };
  series: AnalyticsPoint[];
  topBooks: AnalyticsTopBook[];
  genres: AnalyticsGenre[];
  payments: {
    succeededCount: number;
    revenueCents: number;
    failedCount: number;
    failedAmountCents: number;
  };
  completion: {
    activeReaders: number;
    completed: number;
    rate: number;
  };
}

export interface RecentActivity {
  type: string;
  description: string;
  createdAt: string;
}

export interface BroadcastNotificationDto {
  type: NotificationType;
  title: string;
  body: string;
  userIds?: string[];
}

export interface CreateNotificationDto {
  userId: string;
  title: string;
  body: string;
  type?: NotificationType;
}
