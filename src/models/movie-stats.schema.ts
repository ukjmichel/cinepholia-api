import mongoose, { Document } from 'mongoose';

// Booking subdocument interface and schema
interface Booking {
  bookingId: string;
  userId: string;
  bookedAt: Date;
  seatsNumber: number;
}

const bookingSchema = new mongoose.Schema<Booking>(
  {
    bookingId: { type: String, required: true },
    userId: { type: String, required: true },
    bookedAt: { type: Date, default: Date.now, required: true },
    seatsNumber: { type: Number, required: true },
  },
  { _id: false }
);

// MovieStats document interface
export interface MovieStatsDocument extends Document {
  movieId: string;
  bookings: Booking[];
}

// Main schema
const movieStatsSchema = new mongoose.Schema<MovieStatsDocument>({
  movieId: { type: String, required: true, index: true },
  bookings: [bookingSchema],
});

// Pre-save hook for unique bookingId in bookings array
movieStatsSchema.pre<MovieStatsDocument>('save', function (next) {
  const bookingIds = this.bookings.map((b) => b.bookingId);
  const uniqueBookingIds = new Set(bookingIds);
  if (bookingIds.length !== uniqueBookingIds.size) {
    return next(new Error('Duplicate bookingId detected in bookings array'));
  }
  next();
});

export default mongoose.model<MovieStatsDocument>(
  'MovieStats',
  movieStatsSchema
);
