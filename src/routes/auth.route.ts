import { Router } from 'express';
import { login, refreshToken } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import {
  decodeJwtToken,
} from '../middlewares/auth.middleware.js';
import { permission } from '../middlewares/permission.js';
import { validateCreateUser } from '../validators/user.validator.js';
import { createAccount } from '../controllers/user.controller.js';
import { handleValidationError } from '../middlewares/handleValidatonError.middleware.js';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegister'
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 */
router.post(
  '/register',
  validateCreateUser,
  handleValidationError,
  createAccount('utilisateur')
);

/**
 * @swagger
 * /auth/register-employee:
 *   post:
 *     summary: Register a new employee (Admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRegister'
 *     responses:
 *       201:
 *         description: Employee created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized (not admin)
 */
router.post(
  '/register-employee',
  decodeJwtToken,
  permission.isAdmin,
  validateCreateUser,
  handleValidationError,
  createAccount('employé')
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login and receive tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailOrUsername:
 *                 type: string
 *                 example: johndoe
 *               password:
 *                 type: string
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: Login successful, returns user and tokens
 *       400:
 *         description: Invalid credentials or validation error
 */
router.post('/login', login);

export default router;

/**
 * @swagger
 * components:
 *   schemas:
 *     UserRegister:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         password:
 *           type: string
 */

router.post('/refresh', refreshToken);
