import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PaginatedData, QueryParams, ApiPaginatedPayload, PaginationMeta } from '../models/api.model';
import { buildQueryParams } from '../utils/helpers';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.http
      .get<ApiResponse<T>>(`${this.baseUrl}${path}`, { params: this.toParams(params) })
      .pipe(map((r) => r.data));
  }

  getPaginated<T>(path: string, params?: QueryParams): Observable<PaginatedData<T>> {
    return this.http
      .get<ApiResponse<T[] | ApiPaginatedPayload<T>>>(`${this.baseUrl}${path}`, { params: this.toParams(params) })
      .pipe(map((r) => this.normalizePaginated(r)));
  }

  private normalizePaginated<T>(response: ApiResponse<T[] | ApiPaginatedPayload<T>>): PaginatedData<T> {
    const payload = response.data;

    // API list endpoints return { data: T[], meta } inside the envelope `data` field
    if (payload && typeof payload === 'object' && 'data' in payload && Array.isArray(payload.data)) {
      const nested = payload as ApiPaginatedPayload<T>;
      return { items: nested.data, meta: nested.meta };
    }

    if (Array.isArray(payload)) {
      const meta = response.meta ?? {
        page: 1,
        limit: payload.length,
        total: payload.length,
        totalPages: 1,
      };
      return { items: payload, meta };
    }

    return { items: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } };
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${path}`, body).pipe(map((r) => r.data));
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.http.patch<ApiResponse<T>>(`${this.baseUrl}${path}`, body).pipe(map((r) => r.data));
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.baseUrl}${path}`, body).pipe(map((r) => r.data));
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(`${this.baseUrl}${path}`).pipe(map((r) => r.data));
  }

  upload<T>(path: string, formData: FormData): Observable<T> {
    return this.http.post<ApiResponse<T>>(`${this.baseUrl}${path}`, formData).pipe(map((r) => r.data));
  }

  getBlob(path: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}${path}`, { responseType: 'blob' });
  }

  private toParams(params?: QueryParams): HttpParams {
    let httpParams = new HttpParams();
    const built = buildQueryParams(params);
    for (const [key, value] of Object.entries(built)) {
      httpParams = httpParams.set(key, value);
    }
    return httpParams;
  }
}
