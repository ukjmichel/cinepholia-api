import { Router } from 'express';
import {
  getMovieById,
  createMovie,
  updateMovie,
  deleteMovie,
  getAllMovies,
  searchMovie,
} from '../controllers/movie.controller.js';
import {
  createMovieValidator,
  updateMovieValidator,
  searchMovieValidator,
  movieIdParamValidator,
} from '../validators/movie.validator.js';
import { handleValidationError } from '../middlewares/handleValidatonError.middleware.js';
import { decodeJwtToken } from '../middlewares/auth.middleware.js';
import { permission } from '../middlewares/permission.js';
import { uploadMovieImage } from '../middlewares/upload.middleware.js';

const router = Router();

router.put(
  '/:movieId',
  decodeJwtToken,
  permission.isStaff,
  uploadMovieImage.single('poster'),
  updateMovieValidator,
  handleValidationError,
  updateMovie
);

router.post(
  '/',
  decodeJwtToken,
  permission.isStaff,
  uploadMovieImage.single('poster'),
  handleValidationError,
  createMovie
);

router.delete(
  '/:movieId',
  decodeJwtToken,
  permission.isStaff,
  movieIdParamValidator,
  handleValidationError,
  deleteMovie
);

router.get('/search', searchMovieValidator, handleValidationError, searchMovie);

router.get(
  '/:movieId',
  movieIdParamValidator,
  handleValidationError,
  getMovieById
);

router.get('/', getAllMovies);

export default router;
