import mongoose, { Schema, Document, Model } from 'mongoose';

export interface BookingComment {
  bookingId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  comment: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type BookingCommentDocument = Document & BookingComment;

const bookingCommentSchema = new Schema<BookingCommentDocument>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    comment: { type: String, required: true },
  },
  { timestamps: true }
);

const BookingCommentModel: Model<BookingCommentDocument> =
  mongoose.models.BookingComment ||
  mongoose.model<BookingCommentDocument>('BookingComment', bookingCommentSchema);

export default BookingCommentModel;
