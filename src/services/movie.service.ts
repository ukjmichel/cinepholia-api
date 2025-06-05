import {
  MovieModel,
  MovieAttributes,
  MovieCreationAttributes,
} from '../models/movie.model.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { sequelize } from '../config/db.js';
import { Transaction, Op } from 'sequelize';
import { MovieImageService } from './movie-image.service.js'; // Must exist!

export class MovieService {
  static async getMovieById(movieId: string): Promise<MovieModel> {
    const movie = await MovieModel.findByPk(movieId);
    if (!movie) {
      throw new NotFoundError(`Movie with id ${movieId} not found`);
    }
    return movie;
  }

  static async createMovie(
    payload: MovieCreationAttributes,
    file?: Express.Multer.File
  ): Promise<MovieModel> {
    return await sequelize.transaction(async (t: Transaction) => {
      let posterUrl: string | undefined = undefined;

      if (file) {
        posterUrl = await MovieImageService.saveMovieImage(file);
      }

      const movie = await MovieModel.create(
        { ...payload, posterUrl },
        { transaction: t }
      );
      return movie;
    });
  }

  static async updateMovie(
    movieId: string,
    update: Partial<MovieAttributes>,
    file?: Express.Multer.File
  ): Promise<MovieModel> {
    return await sequelize.transaction(async (t: Transaction) => {
      const movie = await MovieModel.findByPk(movieId, { transaction: t });
      if (!movie) {
        throw new NotFoundError(`Movie with id ${movieId} not found`);
      }

      let posterUrl = update.posterUrl;
      if (file) {
        posterUrl = await MovieImageService.saveMovieImage(file);
      }

      await movie.update({ ...update, posterUrl }, { transaction: t });
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
      // (Optional: delete poster file from storage here if needed)
    });
  }

  static async getAllMovies(): Promise<MovieModel[]> {
    return MovieModel.findAll();
  }

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
