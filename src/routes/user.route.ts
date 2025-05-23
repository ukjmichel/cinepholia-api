// src/routes/user.routes.ts

import express from 'express';
import * as userController from '../controllers/user.controller.js';
import {
  validateCreateUser,
  validateUpdateUser,
  validateUserIdParam,
  validateDeleteUser,
  validateChangePassword,
  validateListUsers,
  validateVerifyUser,
  validateValidatePassword,
} from '../validators/user.validator.js';
import { validate } from '../middlewares/validate.js';

const router = express.Router();

router.post(
  '/register',
  validateCreateUser,
  validate,
  userController.createUser
);

router.get('/', validateListUsers, validate, userController.listUsers);

router.get(
  '/:userId',
  validateUserIdParam,
  validate,
  userController.getUserById
);

router.put('/:userId', validateUpdateUser, validate, userController.updateUser);

router.delete(
  '/:userId',
  validateDeleteUser,
  validate,
  userController.deleteUser
);

router.patch(
  '/:userId/password',
  validateChangePassword,
  validate,
  userController.changePassword
);

router.patch(
  '/:userId/verify',
  validateVerifyUser,
  validate,
  userController.verifyUser
);

router.post(
  '/validate-password',
  validateValidatePassword,
  validate,
  userController.validatePassword
);

export default router;
