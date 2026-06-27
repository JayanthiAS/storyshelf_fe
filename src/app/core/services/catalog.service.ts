import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../http/api.service';
import { PaginatedData, QueryParams } from '../models/api.model';
import {
  Author,
  Book,
  CreateAuthorDto,
  CreateBookDto,
  CreateGenreDto,
  CreateSeriesDto,
  Genre,
  Series,
  UpdateBookDto,
} from '../models/book.model';

@Injectable({ providedIn: 'root' })
export class BookService {
  private readonly api = inject(ApiService);

  list(params?: QueryParams): Observable<PaginatedData<Book>> {
    return this.api.getPaginated<Book>('/books', params);
  }

  recentlyAdded(params?: QueryParams): Observable<PaginatedData<Book>> {
    return this.api.getPaginated<Book>('/books/recently-added', params);
  }

  featured(params?: QueryParams): Observable<PaginatedData<Book>> {
    return this.api.getPaginated<Book>('/books/featured', params);
  }

  getById(id: string): Observable<Book> {
    return this.api.get<Book>(`/books/${id}`);
  }

  getPreview(id: string): Observable<{ shortStory: string }> {
    return this.api.get<{ shortStory: string }>(`/books/${id}/preview`);
  }

  getContent(id: string): Observable<Blob> {
    return this.api.getBlob(`/books/${id}/content`);
  }

  adminList(params?: QueryParams): Observable<PaginatedData<Book>> {
    return this.api.getPaginated<Book>('/admin/books', params);
  }

  adminGet(id: string): Observable<Book> {
    return this.api.get<Book>(`/admin/books/${id}`);
  }

  create(dto: CreateBookDto): Observable<Book> {
    return this.api.post<Book>('/admin/books', dto);
  }

  update(id: string, dto: UpdateBookDto): Observable<Book> {
    return this.api.patch<Book>(`/admin/books/${id}`, dto);
  }

  publish(id: string): Observable<Book> {
    return this.api.patch<Book>(`/admin/books/${id}/publish`, {});
  }

  toggleLock(id: string): Observable<Book> {
    return this.api.patch<Book>(`/admin/books/${id}/lock`, {});
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/admin/books/${id}`);
  }

  restore(id: string): Observable<Book> {
    return this.api.patch<Book>(`/admin/books/${id}/restore`, {});
  }

  uploadFile(id: string, file: File): Observable<Book> {
    const fd = new FormData();
    fd.append('file', file);
    return this.api.upload<Book>(`/admin/books/${id}/upload`, fd);
  }

  uploadCover(id: string, file: File): Observable<Book> {
    const fd = new FormData();
    fd.append('cover', file);
    return this.api.upload<Book>(`/admin/books/${id}/cover`, fd);
  }

  deleteFile(id: string): Observable<void> {
    return this.api.delete<void>(`/admin/books/${id}/file`);
  }
}

@Injectable({ providedIn: 'root' })
export class AuthorService {
  private readonly api = inject(ApiService);

  list(params?: QueryParams): Observable<PaginatedData<Author>> {
    return this.api.getPaginated<Author>('/authors', params);
  }

  getById(id: string): Observable<Author> {
    return this.api.get<Author>(`/authors/${id}`);
  }

  getBooks(id: string, params?: QueryParams): Observable<PaginatedData<Book>> {
    return this.api.getPaginated<Book>(`/authors/${id}/books`, params);
  }

  create(dto: CreateAuthorDto): Observable<Author> {
    return this.api.post<Author>('/admin/authors', dto);
  }

  update(id: string, dto: Partial<CreateAuthorDto>): Observable<Author> {
    return this.api.patch<Author>(`/admin/authors/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/admin/authors/${id}`);
  }

  restore(id: string): Observable<Author> {
    return this.api.patch<Author>(`/admin/authors/${id}/restore`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class GenreService {
  private readonly api = inject(ApiService);

  list(params?: QueryParams): Observable<PaginatedData<Genre>> {
    return this.api.getPaginated<Genre>('/genres', params);
  }

  getById(id: string): Observable<Genre> {
    return this.api.get<Genre>(`/genres/${id}`);
  }

  getBooks(id: string, params?: QueryParams): Observable<PaginatedData<Book>> {
    return this.api.getPaginated<Book>(`/genres/${id}/books`, params);
  }

  create(dto: CreateGenreDto): Observable<Genre> {
    return this.api.post<Genre>('/admin/genres', dto);
  }

  update(id: string, dto: Partial<CreateGenreDto>): Observable<Genre> {
    return this.api.patch<Genre>(`/admin/genres/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/admin/genres/${id}`);
  }

  restore(id: string): Observable<Genre> {
    return this.api.patch<Genre>(`/admin/genres/${id}/restore`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class SeriesService {
  private readonly api = inject(ApiService);

  list(params?: QueryParams): Observable<PaginatedData<Series>> {
    return this.api.getPaginated<Series>('/series', params);
  }

  getById(id: string): Observable<Series> {
    return this.api.get<Series>(`/series/${id}`);
  }

  getBooks(id: string, params?: QueryParams): Observable<PaginatedData<Book>> {
    return this.api.getPaginated<Book>(`/series/${id}/books`, params);
  }

  create(dto: CreateSeriesDto): Observable<Series> {
    return this.api.post<Series>('/admin/series', dto);
  }

  update(id: string, dto: Partial<CreateSeriesDto>): Observable<Series> {
    return this.api.patch<Series>(`/admin/series/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/admin/series/${id}`);
  }
}
