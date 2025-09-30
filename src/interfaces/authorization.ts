/**
 * @module interfaces/authorization
 * @description Public types and interfaces for the Authorization system.
 *
 * This module defines the contracts for user role management and authorization
 * operations within the application. It includes type definitions, DTOs, and
 * service interfaces for handling user permissions and access control.
 */

import { AuthorizationAttributes, Role } from '../models/authorization.model';


/**
 * @interface AuthorizationCreationAttributes
 * @description Attributes required when creating a new authorization record
 * @extends {AuthorizationAttributes}
 */
export interface AuthorizationCreationAttributes
  extends AuthorizationAttributes {
  // All fields are required for creation
}

/**
 * @interface AuthorizationDTO
 * @description Data Transfer Object for authorization information
 * Used for API responses and client-side data handling
 *
 * @property {string} userId - User identifier
 * @property {Role} role - User role
 * @property {Date} [createdAt] - Optional creation timestamp
 * @property {Date} [updatedAt] - Optional last update timestamp
 */
export interface AuthorizationDTO {
  userId: string;
  role: Role;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * @interface RoleUpdateDTO
 * @description DTO for updating a user's role
 *
 * @property {string} userId - User identifier whose role will be updated
 * @property {Role} newRole - New role to assign
 * @property {string} [updatedBy] - Optional: ID of admin performing the update
 */
export interface RoleUpdateDTO {
  userId: string;
  newRole: Role;
  updatedBy?: string;
}

/**
 * @interface AuthorizationCheckDTO
 * @description DTO for authorization check requests
 *
 * @property {string} userId - User identifier to check
 * @property {Role | Role[]} requiredRole - Required role(s) for authorization
 */
export interface AuthorizationCheckDTO {
  userId: string;
  requiredRole: Role | Role[];
}

/**
 * @interface AuthorizationCheckResult
 * @description Result of an authorization check
 *
 * @property {boolean} authorized - Whether the user is authorized
 * @property {Role} userRole - The user's current role
 * @property {string} [reason] - Optional reason if not authorized
 */
export interface AuthorizationCheckResult {
  authorized: boolean;
  userRole: Role;
  reason?: string;
}

/**
 * @interface BulkRoleAssignment
 * @description DTO for assigning roles to multiple users at once
 *
 * @property {string[]} userIds - Array of user identifiers
 * @property {Role} role - Role to assign to all users
 * @property {string} [assignedBy] - Optional: ID of admin performing the assignment
 */
export interface BulkRoleAssignment {
  userIds: string[];
  role: Role;
  assignedBy?: string;
}

/**
 * @interface RoleStatistics
 * @description Statistics about role distribution in the system
 *
 * @property {number} totalUsers - Total number of users with authorizations
 * @property {number} userCount - Number of users with 'user' role
 * @property {number} staffCount - Number of users with 'staff' role
 * @property {number} adminCount - Number of users with 'admin' role
 */
export interface RoleStatistics {
  totalUsers: number;
  userCount: number;
  staffCount: number;
  adminCount: number;
}

/**
 * @interface IAuthorizationService
 * @description Contract for the authorization service
 * Defines all operations related to user role management and permission checking
 */
export interface IAuthorizationService {
  /**
   * @method getAuthorization
   * @description Retrieve authorization record for a specific user
   * @param {string} userId - User identifier
   * @returns {Promise<AuthorizationDTO | null>} Authorization record or null if not found
   */
  getAuthorization(userId: string): Promise<AuthorizationDTO | null>;

  /**
   * @method getUserRole
   * @description Get the role of a specific user
   * @param {string} userId - User identifier
   * @returns {Promise<Role | null>} User's role or null if not found
   */
  getUserRole(userId: string): Promise<Role | null>;

  /**
   * @method createAuthorization
   * @description Create a new authorization record for a user
   * @param {AuthorizationCreationAttributes} data - Authorization data
   * @returns {Promise<AuthorizationDTO>} Created authorization record
   */
  createAuthorization(
    data: AuthorizationCreationAttributes
  ): Promise<AuthorizationDTO>;

  /**
   * @method updateRole
   * @description Update a user's role
   * @param {RoleUpdateDTO} data - Role update data
   * @returns {Promise<AuthorizationDTO>} Updated authorization record
   */
  updateRole(data: RoleUpdateDTO): Promise<AuthorizationDTO>;

  /**
   * @method deleteAuthorization
   * @description Remove authorization record for a user
   * @param {string} userId - User identifier
   * @returns {Promise<boolean>} True if deleted successfully
   */
  deleteAuthorization(userId: string): Promise<boolean>;

  /**
   * @method checkAuthorization
   * @description Check if a user has required role(s)
   * @param {AuthorizationCheckDTO} data - Authorization check data
   * @returns {Promise<AuthorizationCheckResult>} Result of authorization check
   */
  checkAuthorization(
    data: AuthorizationCheckDTO
  ): Promise<AuthorizationCheckResult>;

  /**
   * @method hasRole
   * @description Check if a user has a specific role
   * @param {string} userId - User identifier
   * @param {Role} role - Role to check
   * @returns {Promise<boolean>} True if user has the specified role
   */
  hasRole(userId: string, role: Role): Promise<boolean>;

  /**
   * @method hasAnyRole
   * @description Check if a user has any of the specified roles
   * @param {string} userId - User identifier
   * @param {Role[]} roles - Array of roles to check
   * @returns {Promise<boolean>} True if user has any of the specified roles
   */
  hasAnyRole(userId: string, roles: Role[]): Promise<boolean>;

  /**
   * @method isAdmin
   * @description Check if a user has admin role
   * @param {string} userId - User identifier
   * @returns {Promise<boolean>} True if user is an admin
   */
  isAdmin(userId: string): Promise<boolean>;

  /**
   * @method isStaff
   * @description Check if a user has staff role
   * @param {string} userId - User identifier
   * @returns {Promise<boolean>} True if user is staff
   */
  isStaff(userId: string): Promise<boolean>;

  /**
   * @method bulkAssignRole
   * @description Assign the same role to multiple users
   * @param {BulkRoleAssignment} data - Bulk assignment data
   * @returns {Promise<number>} Number of users updated
   */
  bulkAssignRole(data: BulkRoleAssignment): Promise<number>;

  /**
   * @method getUsersByRole
   * @description Get all users with a specific role
   * @param {Role} role - Role to filter by
   * @returns {Promise<string[]>} Array of user IDs with the specified role
   */
  getUsersByRole(role: Role): Promise<string[]>;

  /**
   * @method getRoleStatistics
   * @description Get statistics about role distribution
   * @returns {Promise<RoleStatistics>} Role distribution statistics
   */
  getRoleStatistics(): Promise<RoleStatistics>;
}

/**
 * @constant ROLE_HIERARCHY
 * @description Defines the hierarchical relationship between roles
 * Higher index = higher privilege level
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  user: 1,
  staff: 2,
  admin: 3,
};

/**
 * @constant ROLE_PERMISSIONS
 * @description Defines basic permissions for each role
 */
export const ROLE_PERMISSIONS = {
  user: [
    'view_movies',
    'make_booking',
    'view_own_bookings',
    'cancel_own_booking',
  ],
  staff: [
    'view_movies',
    'make_booking',
    'view_own_bookings',
    'cancel_own_booking',
    'view_all_bookings',
    'manage_screenings',
    'report_incidents',
  ],
  admin: [
    'view_movies',
    'make_booking',
    'view_own_bookings',
    'cancel_own_booking',
    'view_all_bookings',
    'manage_screenings',
    'report_incidents',
    'manage_users',
    'manage_roles',
    'manage_theaters',
    'view_statistics',
  ],
} as const;

/**
 * @type Permission
 * @description Union type of all possible permissions
 */
export type Permission = (typeof ROLE_PERMISSIONS)[Role][number];

/**
 * @function hasPermission
 * @description Utility function to check if a role has a specific permission
 *
 * @param {Role} role - Role to check
 * @param {Permission} permission - Permission to verify
 * @returns {boolean} True if role has the permission
 *
 * @example
 * if (hasPermission('staff', 'manage_screenings')) {
 *   // Allow access
 * }
 */
export function hasPermission(role: Role, permission: string): boolean {
  return ROLE_PERMISSIONS[role].includes(permission as any);
}

/**
 * @function isRoleHigherOrEqual
 * @description Check if one role has equal or higher privilege than another
 *
 * @param {Role} role - Role to check
 * @param {Role} targetRole - Role to compare against
 * @returns {boolean} True if role is higher or equal
 *
 * @example
 * isRoleHigherOrEqual('admin', 'staff') // true
 * isRoleHigherOrEqual('user', 'admin') // false
 */
export function isRoleHigherOrEqual(role: Role, targetRole: Role): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[targetRole];
}

/**
 * @constant AUTHORIZATION_SERVICE_TOKEN
 * @description DI token for authorization service (if using IoC container)
 */
export const AUTHORIZATION_SERVICE_TOKEN = 'AuthorizationService';
