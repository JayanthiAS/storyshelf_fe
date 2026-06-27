import { QueryParams } from '../models/api.model';
import { SubscriptionMeResponse } from '../models/subscription.model';
import { SubscriptionStatus } from '../models/enums.model';
import { environment } from '../../../environments/environment';

export function buildQueryParams(params?: QueryParams): Record<string, string> {
  if (!params) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = String(value);
    }
  }
  return result;
}

export function hasLockedBookAccess(sub?: SubscriptionMeResponse | null): boolean {
  if (!sub) return false;
  return (
    sub.subscription.status === SubscriptionStatus.Active &&
    sub.plan.unlocksLockedBooks === true
  );
}

export function resolveUploadUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  let normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (normalizedPath.startsWith('/uploads/')) {
    normalizedPath = normalizedPath.slice('/uploads'.length);
  } else if (normalizedPath === '/uploads') {
    normalizedPath = '/';
  }

  const base = environment.uploadsUrl.replace(/\/$/, '');
  return `${base}${normalizedPath}`;
}

export function formatDate(date?: string): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function isFutureDate(date?: string): boolean {
  if (!date) return false;
  return new Date(date) > new Date();
}

export function getAuthorName(author: unknown): string {
  if (!author) return 'Unknown';
  if (typeof author === 'string') return author;
  return (author as { name?: string }).name ?? 'Unknown';
}

export function getEntityId(ref: unknown): string {
  if (!ref) return '';
  if (typeof ref === 'string') return ref;
  return (ref as { _id: string })._id;
}

export function getPlanName(plan: unknown): string {
  if (!plan) return '—';
  if (typeof plan === 'string') return plan;
  return (plan as { name?: string }).name ?? 'Unknown';
}

export function getUserLabel(user: unknown): string {
  if (!user) return '—';
  if (typeof user === 'string') return user;
  const u = user as { email?: string; firstName?: string; lastName?: string };
  if (u.email) return u.email;
  const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
  return name || 'Unknown';
}

export function formatBytes(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateUploadFile(file: File, allowedTypes: string[]): string | null {
  const maxBytes = environment.maxUploadSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File exceeds ${environment.maxUploadSizeMb}MB limit`;
  }
  if (allowedTypes.length && !allowedTypes.includes(file.type)) {
    return `Invalid file type. Allowed: ${allowedTypes.join(', ')}`;
  }
  return null;
}

export const BOOK_FILE_TYPES = ['application/pdf', 'application/epub+zip'];
export const IMAGE_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
