import {
  MovieModel,
  MovieAttributes,
  MovieCreationAttributes,
} from '../models/movie.model.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { sequelize } from '../config/db.js'; // adjust path as needed
import { Transaction, Op } from 'sequelize';

export class MovieService {
  static async getMovieById(movieId: string): Promise<MovieModel> {
    const movie = await MovieModel.findByPk(movieId);
    if (!movie) {
      throw new NotFoundError(`Movie with id ${movieId} not found`);
    }
    return movie;
  }

  static async createMovie(
    payload: MovieCreationAttributes
  ): Promise<MovieModel> {
    return await sequelize.transaction(async (t: Transaction) => {
      const movie = await MovieModel.create(payload, { transaction: t });
      return movie;
    });
  }

  static async updateMovie(
    movieId: string,
    update: Partial<MovieAttributes>
  ): Promise<MovieModel> {
    return await sequelize.transaction(async (t: Transaction) => {
      const movie = await MovieModel.findByPk(movieId, { transaction: t });
      if (!movie) {
        throw new NotFoundError(`Movie with id ${movieId} not found`);
      }
      await movie.update(update, { transaction: t });
      return movie;
    });
  }

  static async deleteMovie(movieId: string): Promise<void> {
    return await sequelize.transaction(async (t: Transaction) => {
      const movie = await MovieModel.findByPk(movieId, { transaction: t });
      if (!movie) {
        throw new NotFoundError(`Movie with id ${movieId} not found`);
      }
      await movie.destroy({ transaction: t });
    });
  }

  static async getAllMovies(): Promise<MovieModel[]> {
    return MovieModel.findAll();
  }

  /**
   * Search for movies by title, director, or genre (partial match).
   * @param {string} query - The search query.
   * @returns {Promise<MovieModel[]>}
   */
  static async searchMovie(query: string): Promise<MovieModel[]> {
    return MovieModel.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${query}%` } },
          { director: { [Op.like]: `%${query}%` } },
          { genre: { [Op.like]: `%${query}%` } },
        ],
      },
    });
  }
}
