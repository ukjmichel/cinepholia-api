import mongoose, { Schema, Document, Model } from 'mongoose';

export interface BookingComment {
  bookingId: string;
  userId: string;
  comment: string;
  rating: number;
  status: 'pending' | 'confirmed';
  createdAt?: Date;
  updatedAt?: Date;
}

export type BookingCommentDocument = Document & BookingComment;

const bookingCommentSchema = new Schema<BookingCommentDocument>(
  {
    bookingId: { type: String, ref: 'Booking', required: true },
    userId: { type: String, ref: 'User', required: true },
    comment: { type: String, required: true },
  },
  { timestamps: true }
);

const BookingCommentModel: Model<BookingCommentDocument> =
  mongoose.models.BookingComment ||
  mongoose.model<BookingCommentDocument>(
    'BookingComment',
    bookingCommentSchema
  );

export default BookingCommentModel;
