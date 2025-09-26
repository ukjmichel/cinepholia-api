// src/routes/auth.routes.ts
import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validateCreateUser } from '../validators/user.validator.js';
import { validateLogin } from '../validators/auth.validator.js';
import { userController } from '../controllers/user.controller.js';
import {
  decodeJwtToken,
  requireAdmin,
} from '../middlewares/auth.middleware.js';

const router = Router();

router.post(
  '/register',
  validateCreateUser,
  userController.createAccount('user')
);
router.post(
  '/register-staff',
  decodeJwtToken,
  requireAdmin,
  validateCreateUser,
  userController.createAccount('staff')
);
router.post('/login', validateLogin, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

export default router;
