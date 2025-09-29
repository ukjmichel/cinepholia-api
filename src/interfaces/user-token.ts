// src/interfaces/user-token.ts

export type UserTokenType = 'verify_email' | 'reset_password' | '2fa';

export interface UserTokenAttributes {
  userId: string;
  type: UserTokenType;
  token: string;
  expiresAt: Date;
  attempts: number;
  lastRequestAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserTokenCreationAttributes {
  userId: string;
  type: UserTokenType;
  token: string;
  expiresAt: Date;
  attempts?: number;
  lastRequestAt?: Date;
}

export interface UserTokenDTO {
  userId: string;
  type: UserTokenType;
  expiresAt: Date;
  attempts: number;
  lastRequestAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserTokenDTO {
  userId: string;
  type: UserTokenType;
  token: string;
  expiresAt: Date;
  attempts?: number;
  lastRequestAt?: Date;
}

export interface UpdateUserTokenDTO {
  type?: UserTokenType;
  token?: string;
  expiresAt?: Date;
  attempts?: number;
  lastRequestAt?: Date;
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

/**
 * Mapper to convert UserTokenModel to safe DTO (excludes sensitive token).
 */
export function toUserTokenDTO(
  token: Pick<
    UserTokenAttributes,
    | 'userId'
    | 'type'
    | 'expiresAt'
    | 'attempts'
    | 'lastRequestAt'
    | 'createdAt'
    | 'updatedAt'
  >
): UserTokenDTO {
  const {
    userId,
    type,
    expiresAt,
    attempts,
    lastRequestAt,
    createdAt,
    updatedAt,
  } = token;

  return {
    userId,
    type,
    expiresAt,
    attempts,
    lastRequestAt,
    createdAt,
    updatedAt,
  };
}
