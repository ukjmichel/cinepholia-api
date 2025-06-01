import mongoose, { Schema } from 'mongoose';

export interface Comment {
  bookingId: string;
  comment: string;
  rating: number;
  status: 'pending' | 'confirmed';
  createdAt?: Date;
  updatedAt?: Date;
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BookingCommentSchema = new Schema<Comment>(
  {
    bookingId: {
      type: String,
      required: [true, 'Booking ID is required'],
      match: [uuidRegex, 'Invalid UUID format for bookingId'],
    },
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [0, 'Rating must be at least 0'],
      max: [5, 'Rating must be at most 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'confirmed'],
        message: 'Status must be either "pending" or "confirmed"',
      },
      default: 'pending',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        return ret;
      },
    },
  }
);

// Ensure one comment per booking
BookingCommentSchema.index({ bookingId: 1 }, { unique: true });

export const BookingCommentModel = mongoose.model<Comment>(
  'Comment',
  BookingCommentSchema
);
