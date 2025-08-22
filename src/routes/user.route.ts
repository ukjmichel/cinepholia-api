import express from 'express';
import * as userController from '../controllers/user.controller.js';
import {
  validateUpdateUser,
  validateUserIdParam,
  validateDeleteUser,
  validateChangePassword,
  validateListUsers,
  validateSearchUsers,
} from '../validators/user.validator.js';
import { validate } from '../middlewares/validate.js';
import { decodeJwtToken } from '../middlewares/auth.middleware.js';
import { permission } from '../middlewares/permission.js';

const router = express.Router();

/**
 * User API Routes
 *
 * All successful API responses follow this structure:
 * - Single user:   { message: string, data: { user: { ...user } } }
 * - User list:     { message: string, data: { users: [ ...user ], total, page, pageSize } }
 * - User search:   { message: string, data: { users: [ ...user ] } }
 * - Delete:        { message: string, data: null }
 *
 * All routes require authentication unless otherwise specified.
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Retrieve a paginated list of users (Staff only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (starting at 1)
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: Number of users per page
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         description: Filter by exact username
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by exact email
 *     responses:
 *       200:
 *         description: A paginated list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PublicUserWithRole'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *       401:
 *         description: Unauthorized (invalid or missing token)
 */
/**
 * GET /users
 * Returns a paginated list of users, only accessible by staff.
 */
router.get(
  '/',
  validateListUsers,
  validate,
  decodeJwtToken,
  permission.isStaff,
  userController.listUsers
);

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get the currently authenticated user's information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/PublicUserWithRole'
 *       401:
 *         description: Unauthorized (invalid or missing token)
 */
/**
 * GET /users/me
 * Returns the current authenticated user's information.
 */
router.get('/me', decodeJwtToken, userController.getCurrentUser);

/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Search for users using global or specific filters (Staff only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Global search term (username, email, name, or ID)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Partial match on user ID
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         description: Partial match on username
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Partial match on email
 *       - in: query
 *         name: firstName
 *         schema:
 *           type: string
 *         description: Partial match on first name
 *       - in: query
 *         name: lastName
 *         schema:
 *           type: string
 *         description: Partial match on last name
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *     responses:
 *       200:
 *         description: List of matching users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PublicUserWithRole'
 *       401:
 *         description: Unauthorized
 */
/**
 * GET /users/search
 * Searches for users by global or field filters, only accessible by staff.
 */
router.get(
  '/search',
  validateSearchUsers,
  validate,
  decodeJwtToken,
  permission.isStaff,
  userController.searchUsers
);

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     summary: Get a user by ID (Self or Staff)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/PublicUserWithRole'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
/**
 * GET /users/:userId
 * Gets a user by ID (self or staff only).
 */
router.get(
  '/:userId',
  validateUserIdParam,
  validate,
  decodeJwtToken,
  permission.isSelfOrStaff,
  userController.getUserById
);

/**
 * @swagger
 * /users/{userId}:
 *   put:
 *     summary: Update a user (Self or Staff)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdate'
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/PublicUserWithRole'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
/**
 * PUT /users/:userId
 * Updates a user (self or staff only).
 */
router.put(
  '/:userId',
  validateUpdateUser,
  validate,
  decodeJwtToken,
  permission.isSelfOrStaff,
  userController.updateUser
);

/**
 * @swagger
 * /users/{userId}:
 *   delete:
 *     summary: Delete a user (Self or Staff)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: 'null'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
/**
 * DELETE /users/:userId
 * Deletes a user (self or staff only).
 */
router.delete(
  '/:userId',
  validateDeleteUser,
  validate,
  decodeJwtToken,
  permission.isSelfOrStaff,
  userController.deleteUser
);

/**
 * @swagger
 * /users/{userId}/password:
 *   patch:
 *     summary: Change a user's password (Self or Admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword:
 *                 type: string
 *                 example: NewPassword123!
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/PublicUserWithRole'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
/**
 * PATCH /users/:userId/password
 * Changes a user's password (self or admin).
 */
router.patch(
  '/:userId/password',
  validateChangePassword,
  validate,
  decodeJwtToken,
  permission.isSelfOrAdmin,
  userController.changePassword
);

export default router;

/**
 * @swagger
 * components:
 *   schemas:
 *     PublicUserWithRole:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         verified:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         role:
 *           type: string
 *           enum: [utilisateur, employé, admin, ...]
 *     UserUpdate:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 */
