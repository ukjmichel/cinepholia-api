import { Request, Response } from 'express';
import MovieStatsService from '../services/movie-stats.service.js';

/**
 * Returns booking stats for a movie.
 */
export const getStats = async (req: Request, res: Response): Promise<any> => {
  const { movieId } = req.params;
  if (!movieId) {
    return res.status(400).json({ message: 'movieId is required.' });
  }

  try {
    const stats = await MovieStatsService.getStatsByMovieId(movieId);
    if (!stats) {
      return res.status(404).json({ message: 'Stats not found.' });
    }
    return res.status(200).json(stats);
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error.' });
  }
};
