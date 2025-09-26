import { Router, Request, Response, NextFunction } from 'express';
import { userController } from '../controllers/user.controller.js';
import { Role } from '../models/authorization.model.js';
import {
  decodeJwtToken,
  requireAdmin,
  requireSelfOrAdmin,
  requireStaffOrAdmin,
} from '../middlewares/auth.middleware.js';

const router = Router();

/** Public signup — creates a user with default role "user". */
router.post(
  '/',
  decodeJwtToken,
  requireAdmin,
  userController.createAccount('user')
);

/** Admin can create a user with a specific role. */
router.post(
  '/role/:role',
  decodeJwtToken,
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) => {
    const role = req.params.role as Role; // 'user' | 'staff' | 'admin'
    // Optionally validate role string here…
    userController.createAccount(role)(req, res, next); // no `return`
  }
);

/** Listing & search — staff or admin */
router.get('/', decodeJwtToken, requireStaffOrAdmin, userController.listUsers);
router.get(
  '/search',
  decodeJwtToken,
  requireStaffOrAdmin,
  userController.searchUsers
);

/** Current user (any authenticated user) & by-id (staff or admin) */
router.get('/me', decodeJwtToken, userController.getCurrentUser);
router.get(
  '/:userId',
  decodeJwtToken,
  requireStaffOrAdmin,
  userController.getUserById
);

/** Update & change password — authenticated */
router.patch(
  '/:userId',
  decodeJwtToken,
  requireSelfOrAdmin,
  userController.updateUser
);
router.post(
  '/:userId/password',
  decodeJwtToken,
  requireSelfOrAdmin,
  userController.changePassword
);

/** Verify & delete — admin only */
router.post(
  '/:userId/verify',
  decodeJwtToken,
  requireSelfOrAdmin,
  userController.verifyUser
);
router.delete(
  '/:userId',
  decodeJwtToken,
  requireSelfOrAdmin,
  userController.deleteUser
);

export default router;
