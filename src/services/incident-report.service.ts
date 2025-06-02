import {
  IncidentReportModel,
  IncidentReportAttributes,
} from '../models/incident-report.model.js';
import { MovieTheaterModel } from '../models/movie-theater.model.js';
import { MovieHallModel } from '../models/movie-hall.model.js';
import { UserModel } from '../models/user.model.js';
import { Op } from 'sequelize';
import { NotFoundError } from '../errors/not-found-error.js';

export class IncidentReportService {
  /**
   * Create a new incident report, only if theater, hall, and user exist.
   * @param data - The incident report attributes
   * @returns The created IncidentReportModel instance
   * @throws {NotFoundError} If the theater, hall, or user does not exist
   */
  async create(
    data: Omit<
      IncidentReportAttributes,
      'incidentId' | 'createdAt' | 'updatedAt'
    >
  ): Promise<IncidentReportModel> {
    // Verify theater exists
    const theater = await MovieTheaterModel.findOne({
      where: { theaterId: data.theaterId },
    });
    if (!theater) {
      throw new NotFoundError(
        `Theater not found for theaterId: ${data.theaterId}`
      );
    }

    // Verify hall exists and belongs to the theater
    const hall = await MovieHallModel.findOne({
      where: {
        theaterId: data.theaterId,
        hallId: data.hallId,
      },
    });
    if (!hall) {
      throw new NotFoundError(
        `Hall not found for theaterId: ${data.theaterId}, hallId: ${data.hallId}`
      );
    }

    // Verify user exists
    const user = await UserModel.findOne({
      where: { userId: data.userId },
    });
    if (!user) {
      throw new NotFoundError(`User not found for userId: ${data.userId}`);
    }

    return IncidentReportModel.create(data);
  }

  /**
   * Find all incident reports, optionally paginated and filtered.
   * @param options - Optional filtering and pagination options
   * @returns An array of IncidentReportModel instances
   */
  async findAll(options?: {
    limit?: number;
    offset?: number;
    status?: IncidentReportAttributes['status'];
    theaterId?: string;
    hallId?: string;
    userId?: string;
    includeAssociations?: boolean;
  }): Promise<IncidentReportModel[]> {
    const where: any = {};

    if (options?.status) {
      where.status = options.status;
    }
    if (options?.theaterId) {
      where.theaterId = options.theaterId;
    }
    if (options?.hallId) {
      where.hallId = options.hallId;
    }
    if (options?.userId) {
      where.userId = options.userId;
    }

    const include = options?.includeAssociations
      ? [UserModel, MovieTheaterModel, MovieHallModel]
      : [];

    return IncidentReportModel.findAll({
      where,
      include,
      limit: options?.limit,
      offset: options?.offset,
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });
  }

  /**
   * Find an incident report by its ID.
   * @param incidentId - The ID of the incident report
   * @param includeAssociations - Whether to include related models
   * @returns The found IncidentReportModel instance
   * @throws {NotFoundError} If the incident report does not exist
   */
  async findById(
    incidentId: string,
    includeAssociations: boolean = false
  ): Promise<IncidentReportModel> {
    const include = includeAssociations
      ? [UserModel, MovieTheaterModel, MovieHallModel]
      : [];

    const incident = await IncidentReportModel.findByPk(incidentId, {
      include,
    });
    if (!incident) {
      throw new NotFoundError(
        `Incident report not found for incidentId: ${incidentId}`
      );
    }
    return incident;
  }

  /**
   * Find all incident reports by theater ID.
   * @param theaterId - The ID of the theater
   * @param includeAssociations - Whether to include related models
   * @returns An array of IncidentReportModel instances
   * @throws {NotFoundError} If no incidents are found for the theater
   */
  async findAllByTheaterId(
    theaterId: string,
    includeAssociations: boolean = false
  ): Promise<IncidentReportModel[]> {
    // Verify theater exists
    const theater = await MovieTheaterModel.findOne({
      where: { theaterId },
    });
    if (!theater) {
      throw new NotFoundError(`Theater not found for theaterId: ${theaterId}`);
    }

    const include = includeAssociations
      ? [UserModel, MovieTheaterModel, MovieHallModel]
      : [];

    const incidents = await IncidentReportModel.findAll({
      where: { theaterId },
      include,
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });

    if (!incidents.length) {
      throw new NotFoundError(
        `No incident reports found for theaterId: ${theaterId}`
      );
    }
    return incidents;
  }

  /**
   * Find all incident reports by hall ID and theater ID.
   * @param theaterId - The ID of the theater
   * @param hallId - The ID of the hall
   * @param includeAssociations - Whether to include related models
   * @returns An array of IncidentReportModel instances
   * @throws {NotFoundError} If no incidents are found for the hall
   */
  async findAllByHall(
    theaterId: string,
    hallId: string,
    includeAssociations: boolean = false
  ): Promise<IncidentReportModel[]> {
    // Verify hall exists
    const hall = await MovieHallModel.findOne({
      where: { theaterId, hallId },
    });
    if (!hall) {
      throw new NotFoundError(
        `Hall not found for theaterId: ${theaterId}, hallId: ${hallId}`
      );
    }

    const include = includeAssociations
      ? [UserModel, MovieTheaterModel, MovieHallModel]
      : [];

    const incidents = await IncidentReportModel.findAll({
      where: { theaterId, hallId },
      include,
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });

    if (!incidents.length) {
      throw new NotFoundError(
        `No incident reports found for theaterId: ${theaterId}, hallId: ${hallId}`
      );
    }
    return incidents;
  }

  /**
   * Find all incident reports by user ID.
   * @param userId - The ID of the user
   * @param includeAssociations - Whether to include related models
   * @returns An array of IncidentReportModel instances
   * @throws {NotFoundError} If no incidents are found for the user
   */
  async findAllByUserId(
    userId: string,
    includeAssociations: boolean = false
  ): Promise<IncidentReportModel[]> {
    // Verify user exists
    const user = await UserModel.findOne({
      where: { userId },
    });
    if (!user) {
      throw new NotFoundError(`User not found for userId: ${userId}`);
    }

    const include = includeAssociations
      ? [UserModel, MovieTheaterModel, MovieHallModel]
      : [];

    const incidents = await IncidentReportModel.findAll({
      where: { userId },
      include,
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });

    if (!incidents.length) {
      throw new NotFoundError(
        `No incident reports found for userId: ${userId}`
      );
    }
    return incidents;
  }

  /**
   * Find all incident reports by status.
   * @param status - The status to filter by
   * @param includeAssociations - Whether to include related models
   * @returns An array of IncidentReportModel instances
   * @throws {NotFoundError} If no incidents are found with the given status
   */
  async findAllByStatus(
    status: IncidentReportAttributes['status'],
    includeAssociations: boolean = false
  ): Promise<IncidentReportModel[]> {
    const include = includeAssociations
      ? [UserModel, MovieTheaterModel, MovieHallModel]
      : [];

    const incidents = await IncidentReportModel.findAll({
      where: { status },
      include,
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });

    if (!incidents.length) {
      throw new NotFoundError(
        `No incident reports found with status: ${status}`
      );
    }
    return incidents;
  }

  /**
   * Update an incident report by its ID.
   * @param incidentId - The ID of the incident report
   * @param data - Partial incident report attributes for update
   * @returns The updated IncidentReportModel instance
   * @throws {NotFoundError} If the incident report does not exist
   */
  async updateById(
    incidentId: string,
    data: Partial<
      Omit<IncidentReportAttributes, 'incidentId' | 'createdAt' | 'updatedAt'>
    >
  ): Promise<IncidentReportModel> {
    const incident = await this.findById(incidentId);

    // If updating theater/hall references, verify they exist
    if (data.theaterId || data.hallId) {
      const theaterId = data.theaterId || incident.theaterId;
      const hallId = data.hallId || incident.hallId;

      const theater = await MovieTheaterModel.findOne({
        where: { theaterId },
      });
      if (!theater) {
        throw new NotFoundError(
          `Theater not found for theaterId: ${theaterId}`
        );
      }

      const hall = await MovieHallModel.findOne({
        where: { theaterId, hallId },
      });
      if (!hall) {
        throw new NotFoundError(
          `Hall not found for theaterId: ${theaterId}, hallId: ${hallId}`
        );
      }
    }

    // If updating user reference, verify user exists
    if (data.userId) {
      const user = await UserModel.findOne({
        where: { userId: data.userId },
      });
      if (!user) {
        throw new NotFoundError(`User not found for userId: ${data.userId}`);
      }
    }

    return incident.update(data);
  }

  /**
   * Update the status of an incident report.
   * @param incidentId - The ID of the incident report
   * @param status - The new status
   * @returns The updated IncidentReportModel instance
   * @throws {NotFoundError} If the incident report does not exist
   */
  async updateStatus(
    incidentId: string,
    status: IncidentReportAttributes['status']
  ): Promise<IncidentReportModel> {
    return this.updateById(incidentId, { status });
  }

  /**
   * Delete an incident report by its ID.
   * @param incidentId - The ID of the incident report
   * @returns An object with a success message
   * @throws {NotFoundError} If the incident report does not exist
   */
  async deleteById(incidentId: string): Promise<{ message: string }> {
    const incident = await this.findById(incidentId);
    await incident.destroy();
    return { message: 'Incident report deleted' };
  }

  /**
   * Search incident reports by title, description, or status.
   * @param query - Search parameters
   * @param options - Optional pagination options
   * @returns An array of matching IncidentReportModel instances
   * @throws {NotFoundError} If no incidents match the search criteria
   */
  async search(
    query: {
      title?: string;
      description?: string;
      status?: IncidentReportAttributes['status'];
      theaterId?: string;
      hallId?: string;
      userId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
    options?: {
      limit?: number;
      offset?: number;
      includeAssociations?: boolean;
    }
  ): Promise<IncidentReportModel[]> {
    const where: any = {};

    if (query.title) {
      where.title = { [Op.like]: `%${query.title}%` };
    }
    if (query.description) {
      where.description = { [Op.like]: `%${query.description}%` };
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.theaterId) {
      where.theaterId = query.theaterId;
    }
    if (query.hallId) {
      where.hallId = query.hallId;
    }
    if (query.userId) {
      where.userId = query.userId;
    }
    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) {
        where.date[Op.gte] = query.dateFrom;
      }
      if (query.dateTo) {
        where.date[Op.lte] = query.dateTo;
      }
    }

    const include = options?.includeAssociations
      ? [UserModel, MovieTheaterModel, MovieHallModel]
      : [];

    const incidents = await IncidentReportModel.findAll({
      where,
      include,
      limit: options?.limit,
      offset: options?.offset,
      order: [
        ['date', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });

    if (!incidents.length) {
      throw new NotFoundError(
        'No incident reports matched the search criteria.'
      );
    }
    return incidents;
  }

  /**
   * Get incident report statistics.
   * @param theaterId - Optional theater ID to filter by
   * @returns Statistics about incident reports
   */
  async getStatistics(theaterId?: string): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    fulfilled: number;
    byTheater?: { [theaterId: string]: number };
  }> {
    const where = theaterId ? { theaterId } : {};

    const [total, pending, inProgress, fulfilled] = await Promise.all([
      IncidentReportModel.count({ where }),
      IncidentReportModel.count({ where: { ...where, status: 'pending' } }),
      IncidentReportModel.count({ where: { ...where, status: 'in_progress' } }),
      IncidentReportModel.count({ where: { ...where, status: 'fulfilled' } }),
    ]);

    const result: any = {
      total,
      pending,
      inProgress,
      fulfilled,
    };

    // If no specific theater, get counts by theater
    if (!theaterId) {
      const byTheaterRaw = await IncidentReportModel.findAll({
        attributes: [
          'theaterId',
          [IncidentReportModel.sequelize!.fn('COUNT', '*'), 'count'],
        ],
        group: ['theaterId'],
        raw: true,
      });

      result.byTheater = byTheaterRaw.reduce((acc: any, item: any) => {
        acc[item.theaterId] = parseInt(item.count);
        return acc;
      }, {});
    }

    return result;
  }
}
