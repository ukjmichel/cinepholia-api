import express from 'express';
import * as userController from '../controllers/user.controller.js';
import {
  validateUpdateUser,
  validateUserIdParam,
  validateDeleteUser,
  validateChangePassword,
  validateListUsers,
} from '../validators/user.validator.js';
import { validate } from '../middlewares/validate.js';
import { decodeJwtToken } from '../middlewares/auth.middleware.js';
import { permission } from '../middlewares/permission.js';

const router = express.Router();

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get a paginated list of users (Staff only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: Users per page
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         description: Username filter
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Email filter
 *     responses:
 *       200:
 *         description: A list of users
 *       401:
 *         description: Unauthorized
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
 *     summary: Change user password (Self or Staff)
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
  permission.isSelfOrStaff,
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
