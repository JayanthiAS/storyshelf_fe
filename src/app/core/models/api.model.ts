import { ApiErrorCode } from './enums.model';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  message?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  items: T[];
  meta: PaginationMeta;
}

/** Shape returned inside the API envelope for list endpoints */
export interface ApiPaginatedPayload<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  code?: ApiErrorCode;
}
