// src/interfaces/movie-theater.ts

export interface MovieTheaterAttributes {
  theaterId: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MovieTheaterCreationAttributes {
  theaterId: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
}

export interface MovieTheaterDTO {
  theaterId: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMovieTheaterDTO {
  theaterId: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
}

export interface UpdateMovieTheaterDTO {
  name?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  phone?: string;
  email?: string;
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
 * Mapper to convert MovieTheaterModel to safe DTO.
 */
export function toMovieTheaterDTO(
  theater: Pick<
    MovieTheaterAttributes,
    | 'theaterId'
    | 'name'
    | 'address'
    | 'postalCode'
    | 'city'
    | 'phone'
    | 'email'
    | 'createdAt'
    | 'updatedAt'
  >
): MovieTheaterDTO {
  const {
    theaterId,
    name,
    address,
    postalCode,
    city,
    phone,
    email,
    createdAt,
    updatedAt,
  } = theater;

  return {
    theaterId,
    name,
    address,
    postalCode,
    city,
    phone,
    email,
    createdAt,
    updatedAt,
  };
}

/**
 * Location-based search result
 */
export interface TheaterLocationResult {
  theaterId: string;
  name: string;
  city: string;
  postalCode: string;
  address: string;
  distance?: number; // in kilometers, if location-based search is implemented
}
