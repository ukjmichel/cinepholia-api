// src/interfaces/user.ts

import { Role } from '../models/authorization.model';

export interface UserAttributes {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreationAttributes {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  verified?: boolean;
}

export interface UserDTO {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDTO {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface UpdateUserDTO {
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  verified?: boolean;
}

/**
 * Generic pagination wrapper for list/search queries.
 */
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  total: number;
}

export type SafeUser = Omit<UserAttributes, 'password'>;
export type PublicUser = UserDTO;

/**
 * Mapper to strip sensitive fields (like password) when exposing user data.
 */
export function toUserDTO(
  user: Pick<
    UserAttributes,
    | 'userId'
    | 'username'
    | 'firstName'
    | 'lastName'
    | 'email'
    | 'verified'
    | 'createdAt'
    | 'updatedAt'
  >
): UserDTO {
  const {
    userId,
    username,
    firstName,
    lastName,
    email,
    verified,
    createdAt,
    updatedAt,
  } = user;

  return {
    userId,
    username,
    firstName,
    lastName,
    email,
    verified,
    createdAt,
    updatedAt,
  };
}

export interface PublicUserWithRole extends Omit<UserAttributes, 'password'> {
  role: Role;
}
