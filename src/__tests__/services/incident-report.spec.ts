import { IncidentReportService } from '../../services/incident-report.service.js';
import { IncidentReportModel } from '../../models/incident-report.model.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { MovieHallModel } from '../../models/movie-hall.model.js';
import { UserModel } from '../../models/user.model.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { Op } from 'sequelize';

const mockIncidentReport = {
  incidentId: 'incident-1',
  theaterId: 'theater-1',
  hallId: 'hall-1',
  title: 'Broken seat in row A',
  description: 'Seat A2 is completely broken and cannot be used by customers.',
  status: 'pending' as const,
  date: new Date('2025-01-15'),
  userId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  update: jest.fn().mockResolvedValue(this),
  destroy: jest.fn().mockResolvedValue(undefined),
  toJSON() {
    return this;
  },
};

const mockTheater = {
  theaterId: 'theater-1',
  address: '123 Theater St',
  postalCode: '12345',
  city: 'New York',
  phone: '+15551234567',
  email: 'contact@theater.com',
};

const mockHall = {
  theaterId: 'theater-1',
  hallId: 'hall-1',
  seatsLayout: [
    ['A1', 'A2', 'A3'],
    ['B1', 'B2', 'B3'],
  ],
};

const mockUser = {
  userId: 'user-1',
  username: 'testuser',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@email.com',
  verified: true,
};

describe('IncidentReportService', () => {
  let service: IncidentReportService;

  beforeEach(() => {
    service = new IncidentReportService();
    jest.clearAllMocks();

    // Reset all mocks
    jest.resetAllMocks();

    // Mock all model methods
    (IncidentReportModel.findByPk as jest.Mock) = jest.fn();
    (IncidentReportModel.create as jest.Mock) = jest.fn();
    (IncidentReportModel.findAll as jest.Mock) = jest.fn();
    (IncidentReportModel.findOne as jest.Mock) = jest.fn();
    (MovieTheaterModel.findOne as jest.Mock) = jest.fn();
    (MovieHallModel.findOne as jest.Mock) = jest.fn();
    (UserModel.findOne as jest.Mock) = jest.fn();
  });

  describe('create', () => {
    it('creates and returns an incident report when all references exist', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(mockTheater);
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue(mockHall);
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (IncidentReportModel.create as jest.Mock).mockResolvedValue(
        mockIncidentReport
      );

      const incidentData = {
        theaterId: 'theater-1',
        hallId: 'hall-1',
        title: 'Test incident',
        description: 'Test description for incident',
        userId: 'user-1',
      };

      const result = await service.create(incidentData);

      expect(MovieTheaterModel.findOne).toHaveBeenCalledWith({
        where: { theaterId: 'theater-1' },
      });
      expect(MovieHallModel.findOne).toHaveBeenCalledWith({
        where: { theaterId: 'theater-1', hallId: 'hall-1' },
      });
      expect(UserModel.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(IncidentReportModel.create).toHaveBeenCalledWith(incidentData);
      expect(result).toBe(mockIncidentReport);
    });

    it('throws NotFoundError if theater does not exist', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(null);

      const incidentData = {
        theaterId: 'non-existent-theater',
        hallId: 'hall-1',
        title: 'Test incident',
        description: 'Test description',
        userId: 'user-1',
      };

      await expect(service.create(incidentData)).rejects.toThrow(NotFoundError);
      expect(MovieTheaterModel.findOne).toHaveBeenCalledWith({
        where: { theaterId: 'non-existent-theater' },
      });
    });

    it('throws NotFoundError if hall does not exist', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(mockTheater);
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue(null);

      const incidentData = {
        theaterId: 'theater-1',
        hallId: 'non-existent-hall',
        title: 'Test incident',
        description: 'Test description',
        userId: 'user-1',
      };

      await expect(service.create(incidentData)).rejects.toThrow(NotFoundError);
      expect(MovieHallModel.findOne).toHaveBeenCalledWith({
        where: { theaterId: 'theater-1', hallId: 'non-existent-hall' },
      });
    });

    it('throws NotFoundError if user does not exist', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(mockTheater);
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue(mockHall);
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);

      const incidentData = {
        theaterId: 'theater-1',
        hallId: 'hall-1',
        title: 'Test incident',
        description: 'Test description',
        userId: 'non-existent-user',
      };

      await expect(service.create(incidentData)).rejects.toThrow(NotFoundError);
      expect(UserModel.findOne).toHaveBeenCalledWith({
        where: { userId: 'non-existent-user' },
      });
    });
  });

  describe('findAll', () => {
    it('returns all incident reports with default ordering', async () => {
      (IncidentReportModel.findAll as jest.Mock).mockResolvedValue([
        mockIncidentReport,
      ]);

      const result = await service.findAll();

      expect(IncidentReportModel.findAll).toHaveBeenCalledWith({
        where: {},
        include: [],
        limit: undefined,
        offset: undefined,
        order: [
          ['date', 'DESC'],
          ['createdAt', 'DESC'],
        ],
      });
      expect(result).toEqual([mockIncidentReport]);
    });

    it('returns incident reports with pagination options', async () => {
      (IncidentReportModel.findAll as jest.Mock).mockResolvedValue([
        mockIncidentReport,
      ]);

      const result = await service.findAll({ limit: 10, offset: 5 });

      expect(IncidentReportModel.findAll).toHaveBeenCalledWith({
        where: {},
        include: [],
        limit: 10,
        offset: 5,
        order: [
          ['date', 'DESC'],
          ['createdAt', 'DESC'],
        ],
      });
      expect(result).toEqual([mockIncidentReport]);
    });
  });

  describe('findAllByTheaterId', () => {
    it('returns incident reports for a theater', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(mockTheater);
      (IncidentReportModel.findAll as jest.Mock).mockResolvedValue([
        mockIncidentReport,
      ]);

      const result = await service.findAllByTheaterId('theater-1');

      expect(MovieTheaterModel.findOne).toHaveBeenCalledWith({
        where: { theaterId: 'theater-1' },
      });
      expect(IncidentReportModel.findAll).toHaveBeenCalledWith({
        where: { theaterId: 'theater-1' },
        include: [],
        order: [
          ['date', 'DESC'],
          ['createdAt', 'DESC'],
        ],
      });
      expect(result).toEqual([mockIncidentReport]);
    });

    it('throws NotFoundError if theater does not exist', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findAllByTheaterId('theater-1')).rejects.toThrow(
        'Theater not found for theaterId: theater-1'
      );
    });

    it('throws NotFoundError if no incidents found for theater', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(mockTheater);
      (IncidentReportModel.findAll as jest.Mock).mockResolvedValue([]);

      await expect(service.findAllByTheaterId('theater-1')).rejects.toThrow(
        'No incident reports found for theaterId: theater-1'
      );
    });
  });

  describe('findAllByHall', () => {
    it('returns incident reports for a specific hall', async () => {
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue(mockHall);
      (IncidentReportModel.findAll as jest.Mock).mockResolvedValue([
        mockIncidentReport,
      ]);

      const result = await service.findAllByHall('theater-1', 'hall-1');

      expect(MovieHallModel.findOne).toHaveBeenCalledWith({
        where: { theaterId: 'theater-1', hallId: 'hall-1' },
      });
      expect(IncidentReportModel.findAll).toHaveBeenCalledWith({
        where: { theaterId: 'theater-1', hallId: 'hall-1' },
        include: [],
        order: [
          ['date', 'DESC'],
          ['createdAt', 'DESC'],
        ],
      });
      expect(result).toEqual([mockIncidentReport]);
    });

    it('throws NotFoundError if hall does not exist', async () => {
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.findAllByHall('theater-1', 'hall-1')
      ).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError if no incidents found for hall', async () => {
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue(mockHall);
      (IncidentReportModel.findAll as jest.Mock).mockResolvedValue([]);

      await expect(
        service.findAllByHall('theater-1', 'hall-1')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('findById', () => {
    it('returns incident report if found', async () => {
      (IncidentReportModel.findByPk as jest.Mock).mockResolvedValue(
        mockIncidentReport
      );

      const result = await service.findById('incident-1');

      expect(IncidentReportModel.findByPk).toHaveBeenCalledWith('incident-1', {
        include: [],
      });
      expect(result).toBe(mockIncidentReport);
    });

    it('throws NotFoundError if incident not found', async () => {
      (IncidentReportModel.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('findAllByUserId', () => {
    it('returns incident reports for a user', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (IncidentReportModel.findAll as jest.Mock).mockResolvedValue([
        mockIncidentReport,
      ]);

      const result = await service.findAllByUserId('user-1');

      expect(UserModel.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(IncidentReportModel.findAll).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: [],
        order: [
          ['date', 'DESC'],
          ['createdAt', 'DESC'],
        ],
      });
      expect(result).toEqual([mockIncidentReport]);
    });

    it('throws NotFoundError if user does not exist', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findAllByUserId('user-1')).rejects.toThrow(
        NotFoundError
      );
    });

    it('throws NotFoundError if no incidents found for user', async () => {
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (IncidentReportModel.findAll as jest.Mock).mockResolvedValue([]);

      await expect(service.findAllByUserId('user-1')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('findAllByStatus', () => {
    it('returns incident reports with specific status', async () => {
      (IncidentReportModel.findAll as jest.Mock).mockResolvedValue([
        mockIncidentReport,
      ]);

      const result = await service.findAllByStatus('pending');

      expect(IncidentReportModel.findAll).toHaveBeenCalledWith({
        where: { status: 'pending' },
        include: [],
        order: [
          ['date', 'DESC'],
          ['createdAt', 'DESC'],
        ],
      });
      expect(result).toEqual([mockIncidentReport]);
    });

    it('throws NotFoundError if no incidents found with status', async () => {
      (IncidentReportModel.findAll as jest.Mock).mockResolvedValue([]);

      await expect(service.findAllByStatus('fulfilled')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('updateById', () => {
    it('updates and returns the incident report', async () => {
      const mockUpdate = jest.fn(function (updateObj) {
        Object.assign(this, updateObj);
        return Promise.resolve(this);
      });
      const mockIncident = {
        ...mockIncidentReport,
        update: mockUpdate,
      };

      // Mock the findById method instead of findByPk directly
      jest.spyOn(service, 'findById').mockResolvedValue(mockIncident as any);

      const updateData = {
        title: 'Updated title',
        status: 'in_progress' as const,
      };
      const result = await service.updateById('incident-1', updateData);

      expect(service.findById).toHaveBeenCalledWith('incident-1');
      expect(mockUpdate).toHaveBeenCalledWith(updateData);
      expect(result.title).toBe('Updated title');
      expect(result.status).toBe('in_progress');
    });

    it('throws NotFoundError if incident not found', async () => {
      jest
        .spyOn(service, 'findById')
        .mockRejectedValue(
          new NotFoundError(
            'Incident report not found for incidentId: non-existent'
          )
        );

      await expect(
        service.updateById('non-existent', { title: 'New title' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateStatus', () => {
    it('updates the status of incident report', async () => {
      const updatedIncident = {
        ...mockIncidentReport,
        status: 'fulfilled' as const,
      };

      // Mock the updateById method since updateStatus calls it internally
      jest
        .spyOn(service, 'updateById')
        .mockResolvedValue(updatedIncident as any);

      const result = await service.updateStatus('incident-1', 'fulfilled');

      expect(service.updateById).toHaveBeenCalledWith('incident-1', {
        status: 'fulfilled',
      });
      expect(result.status).toBe('fulfilled');
    });

    it('throws NotFoundError if incident not found', async () => {
      jest
        .spyOn(service, 'updateById')
        .mockRejectedValue(
          new NotFoundError(
            'Incident report not found for incidentId: non-existent'
          )
        );

      await expect(
        service.updateStatus('non-existent', 'fulfilled')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteById', () => {
    it('deletes the incident report if exists', async () => {
      const mockDestroy = jest.fn().mockResolvedValue(undefined);
      const mockIncident = {
        ...mockIncidentReport,
        destroy: mockDestroy,
      };

      // Mock the findById method since deleteById calls it internally
      jest.spyOn(service, 'findById').mockResolvedValue(mockIncident as any);

      const result = await service.deleteById('incident-1');

      expect(service.findById).toHaveBeenCalledWith('incident-1');
      expect(mockDestroy).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Incident report deleted' });
    });

    it('throws NotFoundError if incident not found', async () => {
      jest
        .spyOn(service, 'findById')
        .mockRejectedValue(
          new NotFoundError(
            'Incident report not found for incidentId: non-existent'
          )
        );

      await expect(service.deleteById('non-existent')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('search', () => {
    it('searches by title only', async () => {
      (IncidentReportModel.findAll as jest.Mock).mockResolvedValue([
        mockIncidentReport,
      ]);

      const result = await service.search({
        title: 'broken',
      });

      expect(IncidentReportModel.findAll).toHaveBeenCalledWith({
        where: {
          title: { [Op.like]: '%broken%' },
        },
        include: [],
        limit: undefined,
        offset: undefined,
        order: [
          ['date', 'DESC'],
          ['createdAt', 'DESC'],
        ],
      });
      expect(result).toEqual([mockIncidentReport]);
    });

    it('searches by description only', async () => {
      (IncidentReportModel.findAll as jest.Mock).mockResolvedValue([
        mockIncidentReport,
      ]);

      const result = await service.search({
        description: 'seat',
      });

      expect(IncidentReportModel.findAll).toHaveBeenCalledWith({
        where: {
          description: { [Op.like]: '%seat%' },
        },
        include: [],
        limit: undefined,
        offset: undefined,
        order: [
          ['date', 'DESC'],
          ['createdAt', 'DESC'],
        ],
      });
      expect(result).toEqual([mockIncidentReport]);
    });

    it('searches by status only', async () => {
      (IncidentReportModel.findAll as jest.Mock).mockResolvedValue([
        mockIncidentReport,
      ]);

      const result = await service.search({
        status: 'pending',
      });

      expect(IncidentReportModel.findAll).toHaveBeenCalledWith({
        where: {
          status: 'pending',
        },
        include: [],
        limit: undefined,
        offset: undefined,
        order: [
          ['date', 'DESC'],
          ['createdAt', 'DESC'],
        ],
      });
      expect(result).toEqual([mockIncidentReport]);
    });

    it('searches by multiple criteria', async () => {
      (IncidentReportModel.findAll as jest.Mock).mockResolvedValue([
        mockIncidentReport,
      ]);

      const result = await service.search({
        title: 'broken',
        description: 'seat',
        status: 'pending',
      });

      expect(IncidentReportModel.findAll).toHaveBeenCalledWith({
        where: {
          title: { [Op.like]: '%broken%' },
          description: { [Op.like]: '%seat%' },
          status: 'pending',
        },
        include: [],
        limit: undefined,
        offset: undefined,
        order: [
          ['date', 'DESC'],
          ['createdAt', 'DESC'],
        ],
      });
      expect(result).toEqual([mockIncidentReport]);
    });

    it('throws NotFoundError if no incidents match search criteria', async () => {
      (IncidentReportModel.findAll as jest.Mock).mockResolvedValue([]);

      await expect(service.search({ title: 'nonexistent' })).rejects.toThrow(
        NotFoundError
      );
    });

    it('handles empty search query by not adding where conditions', async () => {
      (IncidentReportModel.findAll as jest.Mock).mockResolvedValue([
        mockIncidentReport,
      ]);

      const result = await service.search({});

      expect(IncidentReportModel.findAll).toHaveBeenCalledWith({
        where: {},
        include: [],
        limit: undefined,
        offset: undefined,
        order: [
          ['date', 'DESC'],
          ['createdAt', 'DESC'],
        ],
      });
      expect(result).toEqual([mockIncidentReport]);
    });
  });

  describe('Edge cases and error handling', () => {
    it('handles database errors gracefully in create', async () => {
      (MovieTheaterModel.findOne as jest.Mock).mockResolvedValue(mockTheater);
      (MovieHallModel.findOne as jest.Mock).mockResolvedValue(mockHall);
      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (IncidentReportModel.create as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const incidentData = {
        theaterId: 'theater-1',
        hallId: 'hall-1',
        title: 'Test incident',
        description: 'Test description',
        userId: 'user-1',
      };

      await expect(service.create(incidentData)).rejects.toThrow(
        'Database error'
      );
    });

    it('handles database errors gracefully in findAll', async () => {
      (IncidentReportModel.findAll as jest.Mock).mockRejectedValue(
        new Error('Database connection error')
      );

      await expect(service.findAll()).rejects.toThrow(
        'Database connection error'
      );
    });

    it('handles database errors gracefully in update', async () => {
      (IncidentReportModel.findByPk as jest.Mock).mockResolvedValue({
        ...mockIncidentReport,
        update: jest.fn().mockRejectedValue(new Error('Update failed')),
      });

      await expect(
        service.updateById('incident-1', { title: 'New title' })
      ).rejects.toThrow('Update failed');
    });

    it('handles database errors gracefully in delete', async () => {
      (IncidentReportModel.findByPk as jest.Mock).mockResolvedValue({
        ...mockIncidentReport,
        destroy: jest.fn().mockRejectedValue(new Error('Delete failed')),
      });

      await expect(service.deleteById('incident-1')).rejects.toThrow(
        'Delete failed'
      );
    });
  });
});
