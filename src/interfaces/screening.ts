// src/interfaces/screening.ts

export type HallQuality = '2D' | '3D' | 'IMAX' | '4DX';

export interface ScreeningAttributes {
  screeningId: string;
  movieId: string;
  theaterId: string;
  hallId: string; // Changed from UUID to string to match MovieHallModel
  startTime: Date;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScreeningCreationAttributes {
  movieId: string;
  theaterId: string;
  hallId: string; // Changed from UUID to string
  startTime: Date;
  price: number;
}

/**
 * Public DTO returned by controllers.
 * quality is populated via a join to MovieHallModel (not a column on Screening).
 */
export interface ScreeningDTO {
  screeningId: string;
  movieId: string;
  theaterId: string;
  hallId: string; // Changed from UUID to string
  startTime: Date;
  price: number;
  createdAt: Date;
  updatedAt: Date;
  quality?: HallQuality; // <-- NEW
}

export interface CreateScreeningDTO {
  movieId: string;
  theaterId: string;
  hallId: string; // Changed from UUID to string
  startTime: Date;
  price: number;
}

export interface UpdateScreeningDTO {
  movieId?: string;
  theaterId?: string;
  hallId?: string; // Changed from UUID to string
  startTime?: Date;
  price?: number;
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
 * Mapper to convert ScreeningModel-safe pick to ScreeningDTO.
 * Accepts an optional quality (coming from joined hall).
 */
export function toScreeningDTO(
  screening: Pick<
    ScreeningAttributes,
    | 'screeningId'
    | 'movieId'
    | 'theaterId'
    | 'hallId'
    | 'startTime'
    | 'price'
    | 'createdAt'
    | 'updatedAt'
  > & { quality?: HallQuality } // <-- allow quality passthrough
): ScreeningDTO {
  const {
    screeningId,
    movieId,
    theaterId,
    hallId,
    startTime,
    price,
    createdAt,
    updatedAt,
    quality,
  } = screening;

  return {
    screeningId,
    movieId,
    theaterId,
    hallId,
    startTime,
    price,
    createdAt,
    updatedAt,
    quality, // <-- include if present
  };
}

/**
 * Helper interface for screening time analysis
 */
export interface ScreeningTimeInfo {
  screeningId: string;
  movieId: string;
  theaterId: string;
  hallId: string;
  startTime: Date;
  endTime: Date; // calculated based on movie duration
  duration: number; // in minutes
  quality?: HallQuality; // <-- NEW (useful for UI/tooling)
}

/**
 * Interface for screening availability queries
 */
export interface ScreeningAvailability {
  screeningId: string;
  theaterId: string;
  hallId: string;
  startTime: Date;
  isAvailable: boolean;
  conflictingScreenings?: string[]; // IDs of conflicting screenings
  quality?: HallQuality; // <-- NEW
}

/**
 * Interface for screening analytics
 */
export interface ScreeningStats {
  screeningId: string;
  movieId: string;
  theaterId: string;
  hallId: string;
  startTime: Date;
  price: number;
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  occupancyRate: number; // percentage
  revenue: number; // estimated based on bookings
  // NOTE: Typically analytics are aggregated; include quality only if you join hall data upstream.
  quality?: HallQuality; // optional, for richer analytics
}

/**
 * Interface for theater schedule overview
 */
export interface TheaterSchedule {
  theaterId: string;
  date: Date;
  screenings: Array<{
    screeningId: string;
    movieId: string;
    hallId: string;
    startTime: Date;
    endTime: Date;
    price: number;
    quality?: HallQuality; // <-- NEW
  }>;
}

/**
 * Interface for movie showtimes
 */
export interface MovieShowtimes {
  movieId: string;
  screenings: Array<{
    screeningId: string;
    theaterId: string;
    hallId: string;
    startTime: Date;
    price: number;
    quality?: HallQuality; // <-- NEW
  }>;
}

/**
 * Interface for screening conflicts detection
 */
export interface ScreeningConflict {
  theaterId: string;
  hallId: string;
  conflictType: 'overlap' | 'insufficient_gap';
  existingScreening: {
    screeningId: string;
    startTime: Date;
    endTime: Date;
  };
  proposedScreening: {
    startTime: Date;
    endTime: Date;
  };
  minimumGap?: number; // in minutes
}

/**
 * Price range interface for filtering
 */
export interface PriceRange {
  min: number;
  max: number;
}

/**
 * Time slot interface for scheduling
 */
export interface TimeSlot {
  startTime: Date;
  endTime: Date;
}

/**
 * Composite key interface for hall identification in screenings
 * Fixed: Ensures proper theater-hall reference matching MovieHallModel
 */
export interface HallReference {
  theaterId: string;
  hallId: string;
}

/**
 * Enhanced interface for proper hall identification with validation
 */
export interface ValidatedHallReference extends HallReference {
  isValid: boolean;
  quality?: HallQuality;
  capacity?: number;
}
