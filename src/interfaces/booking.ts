// src/interfaces/booking.ts

export type BookingStatus = 'PENDING' | 'USED' | 'CANCELLED';

export interface BookingAttributes {
  bookingId: string;
  userId: string;
  screeningId: string;
  seatsNumber: number;
  totalPrice: number;
  status: BookingStatus;
  bookingDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingCreationAttributes {
  userId: string;
  screeningId: string;
  seatsNumber: number;
  totalPrice: number;
  status?: BookingStatus;
  bookingDate?: Date;
}

export interface BookingDTO {
  bookingId: string;
  userId: string;
  screeningId: string;
  seatsNumber: number;
  totalPrice: number;
  status: BookingStatus;
  bookingDate: Date;
  createdAt: Date;
  updatedAt: Date;
  // Optional associated data
  user?: {
    userId: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  screening?: {
    screeningId: string;
    movieId: string;
    theaterId: string;
    hallId: string;
    startTime: Date;
    price: string;
  };
  movie?: {
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
  };
  bookedSeats?: string[]; // Simplified to just seat IDs
}

export interface CreateBookingDTO {
  userId: string;
  screeningId: string;
  seatsNumber: number;
  totalPrice: number;
  status?: BookingStatus;
  bookingDate?: Date;
}

export interface UpdateBookingDTO {
  userId?: string;
  screeningId?: string;
  seatsNumber?: number;
  totalPrice?: number;
  status?: BookingStatus;
  bookingDate?: Date;
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
 * Mapper to convert BookingModel to safe DTO.
 */
export function toBookingDTO(
  booking: Pick<
    BookingAttributes,
    | 'bookingId'
    | 'userId'
    | 'screeningId'
    | 'seatsNumber'
    | 'totalPrice'
    | 'status'
    | 'bookingDate'
    | 'createdAt'
    | 'updatedAt'
  >,
  user?: any,
  screening?: any,
  movie?: any,
  bookedSeats?: any[]
): BookingDTO {
  const {
    bookingId,
    userId,
    screeningId,
    seatsNumber,
    totalPrice,
    status,
    bookingDate,
    createdAt,
    updatedAt,
  } = booking;

  const dto: BookingDTO = {
    bookingId,
    userId,
    screeningId,
    seatsNumber,
    totalPrice,
    status,
    bookingDate,
    createdAt,
    updatedAt,
    bookedSeats: [], // Always initialize as empty array
  };

  // Add cleaned user data if present
  if (user) {
    const userData = user.dataValues || user.get?.() || user;
    dto.user = {
      userId: userData.userId,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
    };
  }

  // Add cleaned screening data if present
  if (screening) {
    const screeningData =
      screening.dataValues || screening.get?.() || screening;
    dto.screening = {
      screeningId: screeningData.screeningId,
      movieId: screeningData.movieId,
      theaterId: screeningData.theaterId,
      hallId: screeningData.hallId,
      startTime: screeningData.startTime,
      price: screeningData.price,
    };
  }

  // Add cleaned movie data if present
  if (movie) {
    const movieData = movie.dataValues || movie.get?.() || movie;
    dto.movie = {
      movieId: movieData.movieId,
      title: movieData.title,
      description: movieData.description,
      ageRating: movieData.ageRating,
      genre: movieData.genre,
      releaseDate: movieData.releaseDate,
      director: movieData.director,
      durationMinutes: movieData.durationMinutes,
      posterUrl: movieData.posterUrl,
      recommended: movieData.recommended ?? false,
    };
  }

  // Add simplified booked seats (just seat IDs)
  if (bookedSeats && Array.isArray(bookedSeats) && bookedSeats.length > 0) {
    console.log('DTO Mapper - Processing bookedSeats:', bookedSeats);

    dto.bookedSeats = bookedSeats
      .map((seat) => {
        // Handle both Sequelize model instances and plain objects
        const seatData = seat.dataValues || seat.get?.() || seat;
        console.log('DTO Mapper - Processing individual seat:', seatData);

        // Return just the seat ID
        return seatData.seatId;
      })
      .filter(Boolean); // Filter out any undefined/null values

    console.log('DTO Mapper - Final bookedSeats array:', dto.bookedSeats);
  } else {
    console.log(
      'DTO Mapper - No bookedSeats provided or empty array:',
      bookedSeats
    );
  }

  return dto;
}
