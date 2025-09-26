// src/interfaces/movie.ts

export interface MovieAttributes {
  movieId: string;
  title: string;
  description: string;
  ageRating: string;
  genre: string;
  releaseDate: Date;
  director: string;
  durationMinutes: number;
  posterUrl?: string;
  recommended?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MovieCreationAttributes {
  title: string;
  description: string;
  ageRating: string;
  genre: string;
  releaseDate: Date;
  director: string;
  durationMinutes: number;
  posterUrl?: string;
  recommended?: boolean;
}

export interface MovieDTO {
  movieId: string;
  title: string;
  description: string;
  ageRating: string;
  genre: string;
  releaseDate: Date;
  director: string;
  durationMinutes: number;
  posterUrl?: string;
  recommended: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMovieDTO {
  title: string;
  description: string;
  ageRating: string;
  genre: string;
  releaseDate: Date;
  director: string;
  durationMinutes: number;
  posterUrl?: string;
  recommended?: boolean;
}

export interface UpdateMovieDTO {
  title?: string;
  description?: string;
  ageRating?: string;
  genre?: string;
  releaseDate?: Date;
  director?: string;
  durationMinutes?: number;
  posterUrl?: string;
  recommended?: boolean;
}

/**
 * Generic pagination wrapper for list/search queries.
 */
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  total: number;
}

/**
 * Mapper to convert MovieModel to safe DTO.
 */
export function toMovieDTO(
  movie: Pick<
    MovieAttributes,
    | 'movieId'
    | 'title'
    | 'description'
    | 'ageRating'
    | 'genre'
    | 'releaseDate'
    | 'director'
    | 'durationMinutes'
    | 'posterUrl'
    | 'recommended'
    | 'createdAt'
    | 'updatedAt'
  >
): MovieDTO {
  const {
    movieId,
    title,
    description,
    ageRating,
    genre,
    releaseDate,
    director,
    durationMinutes,
    posterUrl,
    recommended,
    createdAt,
    updatedAt,
  } = movie;

  return {
    movieId,
    title,
    description,
    ageRating,
    genre,
    releaseDate,
    director,
    durationMinutes,
    posterUrl,
    recommended: recommended ?? false,
    createdAt,
    updatedAt,
  };
}
