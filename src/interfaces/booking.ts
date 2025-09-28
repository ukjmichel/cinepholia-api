// src/interfaces/booking.ts

export type BookingStatus = 'PENDING' | 'USED' | 'CANCELLED';

export interface BookingAttributes {
  bookingId: string;
  screeningId: string;
  userId: string;
  seats: number;
  totalPrice: number;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingCreationAttributes {
  screeningId: string;
  userId: string;
  seats: number;
  totalPrice: number;
  status?: BookingStatus;
}

export interface BookingDTO {
  bookingId: string;
  screeningId: string;
  userId: string;
  seats: number;
  totalPrice: number;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBookingDTO {
  screeningId: string;
  userId: string;
  seats: number;
  /** Optional: override status on create (defaults to CONFIRMED) */
  status?: BookingStatus;
  /** Optional: price per seat (e.g., promo). If missing, uses Screening.price */
  pricePerSeat?: number;
}

export interface UpdateBookingDTO {
  seats?: number;
  status?: BookingStatus;
}

/** Generic pagination wrapper */
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  total: number;
}

/** Mapper to convert Booking model-safe pick to DTO */
export function toBookingDTO(
  booking: Pick<
    BookingAttributes,
    | 'bookingId'
    | 'screeningId'
    | 'userId'
    | 'seats'
    | 'totalPrice'
    | 'status'
    | 'createdAt'
    | 'updatedAt'
  >
): BookingDTO {
  return {
    bookingId: booking.bookingId,
    screeningId: booking.screeningId,
    userId: booking.userId,
    seats: booking.seats,
    totalPrice: booking.totalPrice,
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}
