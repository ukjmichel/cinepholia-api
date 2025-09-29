import { body, param, query } from 'express-validator';

export const validateCreateBooking = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  body('screeningId')
    .notEmpty()
    .withMessage('Screening ID is required')
    .isUUID()
    .withMessage('Screening ID must be a valid UUID'),
  body('seatIds')
    .isArray({ min: 1 })
    .withMessage('Seat IDs must be a non-empty array')
    .custom((seatIds) => {
      if (
        !seatIds.every((id: any) => typeof id === 'string' && id.length > 0)
      ) {
        throw new Error('All seat IDs must be non-empty strings');
      }
      if (new Set(seatIds).size !== seatIds.length) {
        throw new Error('Duplicate seat IDs are not allowed');
      }
      return true;
    }),
];

export const validateBookingIdParam = [
  param('bookingId')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isUUID()
    .withMessage('Booking ID must be a valid UUID'),
];

export const validateUserIdParam = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
];

export const validateScreeningIdParam = [
  param('screeningId')
    .notEmpty()
    .withMessage('Screening ID is required')
    .isUUID()
    .withMessage('Screening ID must be a valid UUID'),
];

export const validateUpdateBooking = [
  ...validateBookingIdParam,
  body('userId')
    .optional()
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  body('screeningId')
    .optional()
    .isUUID()
    .withMessage('Screening ID must be a valid UUID'),
  body('seatsNumber')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Seats number must be a positive integer'),
  body('totalPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total price must be a non-negative number'),
  body('status')
    .optional()
    .isIn(['PENDING', 'USED', 'CANCELLED'])
    .withMessage('Status must be PENDING, USED, or CANCELLED'),
  body('bookingDate')
    .optional()
    .isISO8601()
    .withMessage('Booking date must be a valid ISO 8601 date'),
];

export const validateListBookings = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn([
      'bookingDate',
      'totalPrice',
      'seatsNumber',
      'status',
      'createdAt',
      'updatedAt',
    ])
    .withMessage('Sort by must be a valid field'),
  query('sortDir')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort direction must be asc or desc'),

  // Filters
  query('bookingId')
    .optional()
    .isUUID()
    .withMessage('Booking ID filter must be a valid UUID'),
  query('userId')
    .optional()
    .isUUID()
    .withMessage('User ID filter must be a valid UUID'),
  query('screeningId')
    .optional()
    .isUUID()
    .withMessage('Screening ID filter must be a valid UUID'),
  query('status')
    .optional()
    .isIn(['PENDING', 'USED', 'CANCELLED'])
    .withMessage('Status filter must be PENDING, USED, or CANCELLED'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min price must be a non-negative number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max price must be a non-negative number'),
  query('minSeats')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Min seats must be a positive integer'),
  query('maxSeats')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max seats must be a positive integer'),
  query('bookedFrom')
    .optional()
    .isISO8601()
    .withMessage('Booked from must be a valid ISO 8601 date'),
  query('bookedTo')
    .optional()
    .isISO8601()
    .withMessage('Booked to must be a valid ISO 8601 date'),
  query('createdFrom')
    .optional()
    .isISO8601()
    .withMessage('Created from must be a valid ISO 8601 date'),
  query('createdTo')
    .optional()
    .isISO8601()
    .withMessage('Created to must be a valid ISO 8601 date'),
  query('updatedFrom')
    .optional()
    .isISO8601()
    .withMessage('Updated from must be a valid ISO 8601 date'),
  query('updatedTo')
    .optional()
    .isISO8601()
    .withMessage('Updated to must be a valid ISO 8601 date'),
];

export const validateSearchBookings = [
  query('q')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .trim()
    .withMessage('Search query must be a string with max 100 characters'),
  ...validateListBookings,
];

export const validateStatusParam = [
  param('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['PENDING', 'USED', 'CANCELLED'])
    .withMessage('Status must be PENDING, USED, or CANCELLED'),
];

export const validateBookingStatus = [
  ...validateBookingIdParam,
  body('status')
    .optional()
    .isIn(['PENDING', 'USED', 'CANCELLED'])
    .withMessage('Status must be PENDING, USED, or CANCELLED'),
];

export const validateGetBookingsByUser = [
  ...validateUserIdParam,
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn([
      'bookingDate',
      'totalPrice',
      'seatsNumber',
      'status',
      'createdAt',
      'updatedAt',
    ])
    .withMessage('Sort by must be a valid field'),
  query('sortDir')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort direction must be asc or desc'),

  // Filters (excluding userId since it's in the URL param)
  query('screeningId')
    .optional()
    .isUUID()
    .withMessage('Screening ID filter must be a valid UUID'),
  query('status')
    .optional()
    .isIn(['PENDING', 'USED', 'CANCELLED'])
    .withMessage('Status filter must be PENDING, USED, or CANCELLED'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min price must be a non-negative number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max price must be a non-negative number'),
  query('minSeats')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Min seats must be a positive integer'),
  query('maxSeats')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max seats must be a positive integer'),
  query('bookedFrom')
    .optional()
    .isISO8601()
    .withMessage('Booked from must be a valid ISO 8601 date'),
  query('bookedTo')
    .optional()
    .isISO8601()
    .withMessage('Booked to must be a valid ISO 8601 date'),
  query('createdFrom')
    .optional()
    .isISO8601()
    .withMessage('Created from must be a valid ISO 8601 date'),
  query('createdTo')
    .optional()
    .isISO8601()
    .withMessage('Created to must be a valid ISO 8601 date'),
  query('updatedFrom')
    .optional()
    .isISO8601()
    .withMessage('Updated from must be a valid ISO 8601 date'),
  query('updatedTo')
    .optional()
    .isISO8601()
    .withMessage('Updated to must be a valid ISO 8601 date'),
];

export const validateGetBookingsByScreening = [
  ...validateScreeningIdParam,
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn([
      'bookingDate',
      'totalPrice',
      'seatsNumber',
      'status',
      'createdAt',
      'updatedAt',
    ])
    .withMessage('Sort by must be a valid field'),
  query('sortDir')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort direction must be asc or desc'),

  // Filters (excluding screeningId since it's in the URL param)
  query('userId')
    .optional()
    .isUUID()
    .withMessage('User ID filter must be a valid UUID'),
  query('status')
    .optional()
    .isIn(['PENDING', 'USED', 'CANCELLED'])
    .withMessage('Status filter must be PENDING, USED, or CANCELLED'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min price must be a non-negative number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max price must be a non-negative number'),
  query('minSeats')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Min seats must be a positive integer'),
  query('maxSeats')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max seats must be a positive integer'),
  query('bookedFrom')
    .optional()
    .isISO8601()
    .withMessage('Booked from must be a valid ISO 8601 date'),
  query('bookedTo')
    .optional()
    .isISO8601()
    .withMessage('Booked to must be a valid ISO 8601 date'),
  query('createdFrom')
    .optional()
    .isISO8601()
    .withMessage('Created from must be a valid ISO 8601 date'),
  query('createdTo')
    .optional()
    .isISO8601()
    .withMessage('Created to must be a valid ISO 8601 date'),
  query('updatedFrom')
    .optional()
    .isISO8601()
    .withMessage('Updated from must be a valid ISO 8601 date'),
  query('updatedTo')
    .optional()
    .isISO8601()
    .withMessage('Updated to must be a valid ISO 8601 date'),
];

export const validateGetBookingsByStatus = [
  ...validateStatusParam,
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn([
      'bookingDate',
      'totalPrice',
      'seatsNumber',
      'status',
      'createdAt',
      'updatedAt',
    ])
    .withMessage('Sort by must be a valid field'),
  query('sortDir')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort direction must be asc or desc'),

  // Filters (excluding status since it's in the URL param)
  query('userId')
    .optional()
    .isUUID()
    .withMessage('User ID filter must be a valid UUID'),
  query('screeningId')
    .optional()
    .isUUID()
    .withMessage('Screening ID filter must be a valid UUID'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min price must be a non-negative number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max price must be a non-negative number'),
  query('minSeats')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Min seats must be a positive integer'),
  query('maxSeats')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max seats must be a positive integer'),
  query('bookedFrom')
    .optional()
    .isISO8601()
    .withMessage('Booked from must be a valid ISO 8601 date'),
  query('bookedTo')
    .optional()
    .isISO8601()
    .withMessage('Booked to must be a valid ISO 8601 date'),
  query('createdFrom')
    .optional()
    .isISO8601()
    .withMessage('Created from must be a valid ISO 8601 date'),
  query('createdTo')
    .optional()
    .isISO8601()
    .withMessage('Created to must be a valid ISO 8601 date'),
  query('updatedFrom')
    .optional()
    .isISO8601()
    .withMessage('Updated from must be a valid ISO 8601 date'),
  query('updatedTo')
    .optional()
    .isISO8601()
    .withMessage('Updated to must be a valid ISO 8601 date'),
];

export const validateGetUpcomingBookings = [
  ...validateUserIdParam,
  query('fromDate')
    .optional()
    .isISO8601()
    .withMessage('From date must be a valid ISO 8601 date'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn([
      'bookingDate',
      'totalPrice',
      'seatsNumber',
      'status',
      'createdAt',
      'updatedAt',
    ])
    .withMessage('Sort by must be a valid field'),
  query('sortDir')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort direction must be asc or desc'),

  // Filters (excluding userId since it's in the URL param)
  query('screeningId')
    .optional()
    .isUUID()
    .withMessage('Screening ID filter must be a valid UUID'),
  query('status')
    .optional()
    .isIn(['PENDING', 'USED', 'CANCELLED'])
    .withMessage('Status filter must be PENDING, USED, or CANCELLED'),
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min price must be a non-negative number'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max price must be a non-negative number'),
  query('minSeats')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Min seats must be a positive integer'),
  query('maxSeats')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max seats must be a positive integer'),
];
