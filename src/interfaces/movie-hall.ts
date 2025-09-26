// src/interfaces/movie-hall.ts

export type HallQuality = '2D' | '3D' | 'IMAX' | '4DX';

export interface MovieHallAttributes {
  theaterId: string;
  hallId: string;
  seatsLayout: (string | number)[][];
  quality: HallQuality;
  createdAt: Date;
  updatedAt: Date;
}

export interface MovieHallCreationAttributes {
  theaterId: string;
  hallId: string;
  seatsLayout: (string | number)[][];
  quality: HallQuality;
}

export interface MovieHallDTO {
  theaterId: string;
  hallId: string;
  seatsLayout: (string | number)[][];
  quality: HallQuality;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMovieHallDTO {
  theaterId: string;
  hallId: string;
  seatsLayout: (string | number)[][];
  quality: HallQuality;
}

export interface UpdateMovieHallDTO {
  seatsLayout?: (string | number)[][];
  quality?: HallQuality;
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
 * Mapper to convert MovieHallModel to safe DTO.
 */
export function toMovieHallDTO(
  hall: Pick<
    MovieHallAttributes,
    | 'theaterId'
    | 'hallId'
    | 'seatsLayout'
    | 'quality'
    | 'createdAt'
    | 'updatedAt'
  >
): MovieHallDTO {
  const { theaterId, hallId, seatsLayout, quality, createdAt, updatedAt } =
    hall;

  return {
    theaterId,
    hallId,
    seatsLayout,
    quality,
    createdAt,
    updatedAt,
  };
}

/**
 * Helper interface for seat counting and layout analysis
 */
export interface HallCapacityInfo {
  theaterId: string;
  hallId: string;
  totalSeats: number;
  rows: number;
  maxSeatsPerRow: number;
  quality: HallQuality;
}

/**
 * Interface for hall availability queries
 */
export interface HallAvailability {
  theaterId: string;
  hallId: string;
  quality: HallQuality;
  isAvailable: boolean;
  nextAvailableTime?: Date;
}

/**
 * Composite key interface for hall identification
 */
export interface HallIdentifier {
  theaterId: string;
  hallId: string;
}
