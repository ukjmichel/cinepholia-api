import { Router } from 'express';
import {
  sendResetPasswordToken,
  validateTokenValidity,
  resetPasswordController,
} from '../controllers/user-token.controller.js';
import {
  validateSendResetPasswordToken,
  validateCheckResetPasswordToken,
  validateConfirmResetPassword,
} from '../validators/user-token.validator.js';
import { validate } from '../middlewares/validate.js';
import { permission } from '../middlewares/permission.js';

const router = Router();

router.post(
  '/reset-password',
  validateSendResetPasswordToken,
  validate,
  sendResetPasswordToken
);

router.post(
  '/check-reset-password',
  validateCheckResetPasswordToken,
  validate,
  validateTokenValidity('reset_password')
);

router.post(
  '/confirm-reset-password',
  validateConfirmResetPassword,
  validate,
  resetPasswordController
);

export default router;
