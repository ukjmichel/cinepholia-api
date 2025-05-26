import { Router } from 'express';
import { MovieTheaterController } from '../controllers/movie-theater.controller.js';
import {
  createMovieTheaterValidator,
  updateMovieTheaterValidator,
  searchMovieTheaterValidator,
  movieTheaterIdParamValidator,
} from '../validators/movie-theater.validator.js';

import { decodeJwtToken } from '../middlewares/auth.middleware.js';
import { permission } from '../middlewares/permission.js';
import { handleValidationError } from '../middlewares/handleValidatonError.middleware.js';

const router = Router();

/**
 * @swagger
 * /movie-theaters:
 *   post:
 *     summary: Create a new movie theater (Staff only)
 *     tags: [Movie Theaters]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MovieTheaterCreate'
 *     responses:
 *       201:
 *         description: Movie theater created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Theater with given ID already exists
 */
router.post(
  '/',
  decodeJwtToken,
  permission.isStaff,
  createMovieTheaterValidator,
  handleValidationError,
  MovieTheaterController.create
);

/**
 * @swagger
 * /movie-theaters/{id}:
 *   put:
 *     summary: Update a movie theater (Staff only)
 *     tags: [Movie Theaters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The theater ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MovieTheaterUpdate'
 *     responses:
 *       200:
 *         description: Movie theater updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Movie theater not found
 */
router.put(
  '/:id',
  decodeJwtToken,
  permission.isStaff,
  updateMovieTheaterValidator,
  handleValidationError,
  MovieTheaterController.update
);

/**
 * @swagger
 * /movie-theaters/{id}:
 *   delete:
 *     summary: Delete a movie theater (Staff only)
 *     tags: [Movie Theaters]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The theater ID
 *     responses:
 *       204:
 *         description: Movie theater deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Movie theater not found
 */
router.delete(
  '/:id',
  decodeJwtToken,
  permission.isStaff,
  movieTheaterIdParamValidator,
  handleValidationError,
  MovieTheaterController.delete
);

/**
 * @swagger
 * /movie-theaters/search:
 *   get:
 *     summary: Search for movie theaters
 *     tags: [Movie Theaters]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: City filter (optional)
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *         description: Address filter (optional)
 *       - in: query
 *         name: postalCode
 *         schema:
 *           type: string
 *         description: Postal code filter (optional)
 *       - in: query
 *         name: theaterId
 *         schema:
 *           type: string
 *         description: Theater ID filter (optional)
 *     responses:
 *       200:
 *         description: List of movie theaters matching the filters
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MovieTheater'
 *       400:
 *         description: Validation error
 */
router.get(
  '/search',
  searchMovieTheaterValidator,
  handleValidationError,
  MovieTheaterController.search
);

/**
 * @swagger
 * /movie-theaters/{id}:
 *   get:
 *     summary: Get a movie theater by ID
 *     tags: [Movie Theaters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The theater ID
 *     responses:
 *       200:
 *         description: Movie theater object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MovieTheater'
 *       404:
 *         description: Movie theater not found
 */
router.get(
  '/:id',
  movieTheaterIdParamValidator,
  handleValidationError,
  MovieTheaterController.getById
);

/**
 * @swagger
 * /movie-theaters:
 *   get:
 *     summary: Get all movie theaters
 *     tags: [Movie Theaters]
 *     responses:
 *       200:
 *         description: List of all movie theaters
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/MovieTheater'
 */
router.get('/', MovieTheaterController.getAll);

export default router;

/**
 * @swagger
 * components:
 *   schemas:
 *     MovieTheater:
 *       type: object
 *       properties:
 *         theaterId:
 *           type: string
 *           example: cinema-lyon-01
 *         address:
 *           type: string
 *           example: 1 Rue de la République
 *         postalCode:
 *           type: string
 *           example: "69001"
 *         city:
 *           type: string
 *           example: Lyon
 *         phone:
 *           type: string
 *           example: "+33456789012"
 *         email:
 *           type: string
 *           example: contact@cinema-lyon.fr
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2024-05-20T10:15:30Z
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: 2024-05-21T09:18:55Z
 *     MovieTheaterCreate:
 *       type: object
 *       required:
 *         - theaterId
 *         - address
 *         - postalCode
 *         - city
 *         - phone
 *         - email
 *       properties:
 *         theaterId:
 *           type: string
 *           example: cinema-lyon-01
 *         address:
 *           type: string
 *           example: 1 Rue de la République
 *         postalCode:
 *           type: string
 *           example: "69001"
 *         city:
 *           type: string
 *           example: Lyon
 *         phone:
 *           type: string
 *           example: "+33456789012"
 *         email:
 *           type: string
 *           example: contact@cinema-lyon.fr
 *     MovieTheaterUpdate:
 *       type: object
 *       properties:
 *         address:
 *           type: string
 *           example: 2 Avenue des Champs-Élysées
 *         postalCode:
 *           type: string
 *           example: "75008"
 *         city:
 *           type: string
 *           example: Paris
 *         phone:
 *           type: string
 *           example: "+33123456789"
 *         email:
 *           type: string
 *           example: contact@cinema-paris.fr
 */
