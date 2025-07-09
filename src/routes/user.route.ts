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
 *         description: A list of users
 *       401:
 *         description: Unauthorized (invalid or missing token)
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
 *       401:
 *         description: Unauthorized (invalid or missing token)
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
 *       401:
 *         description: Unauthorized
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
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
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
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
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
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
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
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
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
