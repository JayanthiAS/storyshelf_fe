import { BookStatus } from './enums.model';

export interface Author {
  _id: string;
  name: string;
  bio?: string;
  profileImageUrl?: string;
  bookCount?: number;
  createdAt?: string;
}

export interface Genre {
  _id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Series {
  _id: string;
  title: string;
  description?: string;
  totalVolumes?: number;
}

export interface Book {
  _id: string;
  title: string;
  slug: string;
  authorId: string | Author;
  genreIds: (string | Genre)[];
  seriesId?: string | Series;
  volumeNumber?: number;
  description: string;
  shortStory?: string;
  releaseDate?: string;
  pageCount?: number;
  isLocked: boolean;
  coverImageUrl?: string;
  fileUrl?: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
  status: BookStatus;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  accessDenied?: boolean;
  accessReason?: string;
}

export interface CreateBookDto {
  title: string;
  authorId: string;
  genreIds: string[];
  seriesId?: string;
  volumeNumber?: number;
  description: string;
  shortStory?: string;
  releaseDate?: string;
  pageCount?: number;
  isLocked?: boolean;
}

export interface UpdateBookDto extends Partial<CreateBookDto> {}

export interface CreateAuthorDto {
  name: string;
  bio?: string;
}

export interface CreateGenreDto {
  name: string;
  description?: string;
}

export interface CreateSeriesDto {
  title: string;
  description?: string;
  totalVolumes?: number;
}
