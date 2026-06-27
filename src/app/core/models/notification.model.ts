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
  lastReadAt: string;
}

export interface ReadingSessionDto {
  bookId: string;
  durationSeconds: number;
  startedAt: string;
  endedAt: string;
}

export interface DashboardStats {
  users: number;
  books: number;
  activeSubscriptions: number;
  revenue: number;
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
