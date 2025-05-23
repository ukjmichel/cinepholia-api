import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { UserAttributes } from '../models/user.model.js';
import { authorizationService } from '../services/authorization.service.js';
import { BadRequestError } from '../errors/bad-request-error.js';
import { NotFoundError } from '../errors/not-found-error.js';
import { UnauthorizedError } from '../errors/unauthorized-error.js';
import { sequelize } from '../config/db.js';
import { EmailService } from '../services/email.service.js';

export const emailService = new EmailService();

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const transaction = await sequelize.transaction();

  try {
    const { role, ...userData } = req.body;

    // Création utilisateur dans la transaction
    const user = await userService.createUser(userData, { transaction });

    // Création autorisation dans la transaction
    await authorizationService.createAuthorization(
      { userId: user.userId, role: role ?? 'utilisateur' },
      { transaction }
    );

    // Envoi de l'email de bienvenue
    await emailService.sendWelcomeEmail(user.email, user.firstName);

    // Commit si tout est OK
    await transaction.commit();

    res.status(201).json({
      message: 'User created successfully',
      data: user,
    });
  } catch (error) {
    // Rollback en cas d'erreur
    await transaction.rollback();
    next(error);
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.getUserById(req.params.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    res.status(200).json({
      message: 'User found successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.updateUser(
      req.params.userId,
      req.body as Partial<UserAttributes>
    );
    res.status(200).json({
      message: 'User updated successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { newPassword } = req.body;
    if (!newPassword) throw new BadRequestError('Password is required');
    const user = await userService.changePassword(
      req.params.userId,
      newPassword
    );
    res.status(200).json({
      message: 'Password changed successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

export const verifyUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.verifyUser(req.params.userId);
    res.status(200).json({
      message: 'User verified',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const deleted = await userService.deleteUser(req.params.userId);
    if (deleted) {
      res.status(200).json({ message: 'User deleted', data: null });
    } else {
      throw new NotFoundError('User not found');
    }
  } catch (err) {
    next(err);
  }
};

export const listUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Parse pagination and filters from query
    const page = req.query.page
      ? parseInt(req.query.page as string, 10)
      : undefined;
    const pageSize = req.query.pageSize
      ? parseInt(req.query.pageSize as string, 10)
      : undefined;
    const filters = {
      username: req.query.username as string | undefined,
      email: req.query.email as string | undefined,
      verified:
        req.query.verified !== undefined
          ? req.query.verified === 'true'
          : undefined,
    };

    const result = await userService.listUsers({ page, pageSize, filters });
    res.status(200).json({
      message: 'Users found successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const validatePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      throw new BadRequestError('Email or username and password are required');
    }
    const user = await userService.validatePassword(emailOrUsername, password);
    if (!user) {
      throw new UnauthorizedError('Invalid email or username or password');
    }
    res.status(200).json({
      message: 'User validated successfully',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};
