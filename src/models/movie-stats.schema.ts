import mongoose, { Document, Schema, Model } from 'mongoose';

/** Interface for daily booking number entries */
export interface BookingNumber {
  date: string; // "YYYY-MM-DD"
  number: number;
}

/** BookingNumber subdocument schema */
const bookingNumberSchema = new Schema<BookingNumber>(
  {
    date: { type: String, required: true },
    number: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

/** Main MovieStats document interface */
export interface MovieStatsDocument extends Document {
  movieId: string;
  bookingNumbers: BookingNumber[];
}

/** MovieStats schema */
const movieStatsSchema = new Schema<MovieStatsDocument>({
  movieId: { type: String, required: true, index: true },
  bookingNumbers: { type: [bookingNumberSchema], default: [] },
});

/**
 * Pre-save hook:
 * - Sorts by date DESC
 * - Removes duplicate dates (keeps first/most recent)
 * - Keeps only last 7 days
 */
movieStatsSchema.pre<MovieStatsDocument>('save', function (next) {
  // Sort by date DESC
  this.bookingNumbers.sort((a, b) => b.date.localeCompare(a.date));

  // Remove duplicates (by date, keep first)
  const seen = new Set<string>();
  const deduped = this.bookingNumbers.filter((entry) => {
    if (seen.has(entry.date)) return false;
    seen.add(entry.date);
    return true;
  });

  // Only keep last 7 days
  this.set('bookingNumbers', deduped.slice(0, 7));

  next();
});

const MovieStats: Model<MovieStatsDocument> =
  mongoose.model<MovieStatsDocument>('MovieStats', movieStatsSchema);
export default MovieStats;
