// src/utils/to-public-user-with-role.ts
import type { Transaction } from 'sequelize';
import { Role } from '../models/authorization.model.js';
import { authorizationService } from '../services/authorization.service.js';
import type { PublicUserWithRole, UserAttributes } from '../interfaces/user.js';
import type { UserModel } from '../models/user.model.js';

type Options = { transaction?: Transaction };

/**
 * Convert a UserModel/DTO-like object to a public view with its role.
 */
export async function toPublicUserWithRole(
  user: UserModel | (Partial<UserAttributes> & { userId: string }) | null,
  options?: Options
): Promise<PublicUserWithRole | null> {
  if (!user) return null;

  const data =
    typeof (user as any).get === 'function'
      ? (user as any).get({ plain: true })
      : user;

  const { password, ...publicFields } = data as UserAttributes;

  const authorization = await authorizationService.get(
    (data as any).userId,
    options
  );

  return {
    ...(publicFields as Omit<UserAttributes, 'password'>),
    role: (authorization?.role as Role) ?? 'utilisateur',
  };
}
