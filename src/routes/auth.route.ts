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

const authRouter = Router();

authRouter.post(
  '/register',
  validateCreateUser,
  userController.createAccount('user')
);
authRouter.post(
  '/register-staff',
  decodeJwtToken,
  requireAdmin,
  validateCreateUser,
  userController.createAccount('staff')
);
authRouter.post('/login', validateLogin, authController.login);
authRouter.post('/refresh', authController.refreshToken);
authRouter.post('/logout', authController.logout);

export default authRouter;
