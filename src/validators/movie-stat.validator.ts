import { param, query } from 'express-validator';

/**
 * Validates the movieId parameter in the route path
 * Used for: GET /api/movies/:movieId/stats
 */
export const validateMovieIdParam = [
  param('movieId')
    .notEmpty()
    .withMessage('Movie ID is required')
    .isUUID()
    .withMessage('Movie ID must be a valid UUID'),
];

/**
 * Validates query parameters for fetching multiple movie statistics
 * Used for: GET /api/movies/stats?movieIds=uuid1,uuid2,uuid3
 */
export const validateMultipleMovieStats = [
  query('movieIds')
    .notEmpty()
    .withMessage('movieIds query parameter is required')
    .isString()
    .withMessage('movieIds must be a string')
    .custom((value: string) => {
      // Split by comma and validate each ID
      const ids = value.split(',').map((id) => id.trim());

      if (ids.length === 0) {
        throw new Error('At least one movie ID is required');
      }

      if (ids.length > 50) {
        throw new Error('Maximum 50 movie IDs allowed per request');
      }

      // Check each ID is non-empty
      const emptyIds = ids.filter((id) => !id || id.length === 0);
      if (emptyIds.length > 0) {
        throw new Error('All movie IDs must be non-empty strings');
      }

      // Check for UUID format (basic pattern check)
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const invalidIds = ids.filter((id) => !uuidPattern.test(id));

      if (invalidIds.length > 0) {
        throw new Error(
          `Invalid UUID format for movie IDs: ${invalidIds.slice(0, 3).join(', ')}${invalidIds.length > 3 ? '...' : ''}`
        );
      }

      return true;
    })
    .trim(),
];

/**
 * Optional: Validates date parameter for historical stats queries
 * Can be used for: GET /api/movies/:movieId/stats?date=2025-10-03
 */
export const validateStatsDateParam = [
  query('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format (YYYY-MM-DD)')
    .custom((value: string) => {
      const date = new Date(value);
      const today = new Date();

      // Check if date is not in the future
      if (date > today) {
        throw new Error('Date cannot be in the future');
      }

      // Check if date is not too old (e.g., more than 30 days ago)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      if (date < thirtyDaysAgo) {
        throw new Error('Date cannot be more than 30 days in the past');
      }

      return true;
    }),
];

/**
 * Validates query parameters for stats with date range
 * Can be used for: GET /api/movies/:movieId/stats?from=2025-10-01&to=2025-10-03
 */
export const validateStatsDateRange = [
  query('from')
    .optional()
    .isISO8601()
    .withMessage('From date must be in ISO 8601 format (YYYY-MM-DD)'),

  query('to')
    .optional()
    .isISO8601()
    .withMessage('To date must be in ISO 8601 format (YYYY-MM-DD)')
    .custom((toDate: string, { req }) => {
      const fromDate = req.query?.from as string | undefined;

      if (fromDate && toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);

        if (to < from) {
          throw new Error('To date must be after from date');
        }

        // Check if range is not too large (e.g., max 7 days)
        const daysDiff = Math.floor(
          (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff > 7) {
          throw new Error('Date range cannot exceed 7 days');
        }
      }

      return true;
    }),
];
