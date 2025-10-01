// src/__tests__/services/incident-report.service.spec.ts
import { jest } from '@jest/globals';
import { IncidentReportService } from '../../services/incident-report.service.js';
import { IncidentReportModel } from '../../models/incident-report.schema.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { BadRequestError } from '../../errors/bad-request-error.js';
import movieTheaterService from '../../services/movie-theater.service.js';
import movieHallService from '../../services/movie-hall.service.js';

describe('IncidentReportService', () => {
  const svc = new IncidentReportService();

  const baseIncident: any = {
    incidentId: 'incident-123',
    theaterId: 'theater-123',
    hallId: 'hall-1',
    description: 'Broken seat in row A',
    status: 'open' as const,
    createdBy: 'user-123',
    createdAt: new Date('2025-10-01T10:00:00Z'),
    updatedAt: new Date('2025-10-01T10:00:00Z'),
  };

  const mockTheater = {
    theaterId: 'theater-123',
    name: 'Test Theater',
    address: '123 Main St',
  };

  const mockHall = {
    hallId: 'hall-1',
    theaterId: 'theater-123',
    name: 'Hall 1',
    capacity: 100,
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates incident report successfully', async () => {
      jest
        .spyOn(movieTheaterService, 'get')
        .mockResolvedValue(mockTheater as any);
      jest.spyOn(movieHallService, 'get').mockResolvedValue(mockHall as any);

      const mockCreated = {
        ...baseIncident,
        toObject: jest.fn().mockReturnValue(baseIncident),
      };

      jest
        .spyOn(IncidentReportModel, 'create')
        .mockResolvedValue(mockCreated as any);

      const result = await svc.create({
        theaterId: 'theater-123',
        hallId: 'hall-1',
        description: 'Broken seat in row A',
        createdBy: 'user-123',
      });

      expect(result).toBeDefined();
      expect(result.incidentId).toBe('incident-123');
      expect(result.description).toBe('Broken seat in row A');
      expect(movieTheaterService.get).toHaveBeenCalledWith('theater-123');
      expect(movieHallService.get).toHaveBeenCalledWith(
        'theater-123',
        'hall-1'
      );
    });

    it('throws BadRequestError when theater does not exist', async () => {
      jest.spyOn(movieTheaterService, 'get').mockResolvedValue(null);

      await expect(
        svc.create({
          theaterId: 'nonexistent-theater',
          hallId: 'hall-1',
          description: 'Test incident',
          createdBy: 'user-123',
        })
      ).rejects.toThrow(BadRequestError);

      await expect(
        svc.create({
          theaterId: 'nonexistent-theater',
          hallId: 'hall-1',
          description: 'Test incident',
          createdBy: 'user-123',
        })
      ).rejects.toThrow('Theater with ID "nonexistent-theater" does not exist');
    });

    it('throws BadRequestError when hall does not exist', async () => {
      jest
        .spyOn(movieTheaterService, 'get')
        .mockResolvedValue(mockTheater as any);
      jest.spyOn(movieHallService, 'get').mockResolvedValue(null);

      await expect(
        svc.create({
          theaterId: 'theater-123',
          hallId: 'nonexistent-hall',
          description: 'Test incident',
          createdBy: 'user-123',
        })
      ).rejects.toThrow(BadRequestError);

      await expect(
        svc.create({
          theaterId: 'theater-123',
          hallId: 'nonexistent-hall',
          description: 'Test incident',
          createdBy: 'user-123',
        })
      ).rejects.toThrow(
        'Hall "nonexistent-hall" does not exist in theater "theater-123"'
      );
    });

    it('creates incident with custom incidentId', async () => {
      jest
        .spyOn(movieTheaterService, 'get')
        .mockResolvedValue(mockTheater as any);
      jest.spyOn(movieHallService, 'get').mockResolvedValue(mockHall as any);

      const customId = '550e8400-e29b-41d4-a716-446655440000';
      const mockCreated = {
        ...baseIncident,
        incidentId: customId,
        toObject: jest
          .fn()
          .mockReturnValue({ ...baseIncident, incidentId: customId }),
      };

      jest
        .spyOn(IncidentReportModel, 'create')
        .mockResolvedValue(mockCreated as any);

      const result = await svc.create({
        incidentId: customId,
        theaterId: 'theater-123',
        hallId: 'hall-1',
        description: 'Test',
        createdBy: 'user-123',
      });

      expect(result.incidentId).toBe(customId);
    });
  });

  describe('get', () => {
    it('returns incident when found', async () => {
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(baseIncident);
      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'findOne').mockReturnValue({
        // @ts-ignore
        lean: leanSpy,
      });

      const result = await svc.get('incident-123');

      expect(result).toBeDefined();
      expect(result?.incidentId).toBe('incident-123');
      expect(IncidentReportModel.findOne).toHaveBeenCalledWith({
        incidentId: 'incident-123',
      });
    });

    it('returns null when incident not found', async () => {
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(null);
      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'findOne').mockReturnValue({
        // @ts-ignore
        lean: leanSpy,
      });

      const result = await svc.get('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getById', () => {
    it('returns incident when found', async () => {
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(baseIncident);
      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'findOne').mockReturnValue({
        // @ts-ignore
        lean: leanSpy,
      });

      const result = await svc.getById('incident-123');

      expect(result).toBeDefined();
      expect(result.incidentId).toBe('incident-123');
    });

    it('throws NotFoundError when incident not found', async () => {
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(null);
      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'findOne').mockReturnValue({
        // @ts-ignore
        lean: leanSpy,
      });

      await expect(svc.getById('nonexistent')).rejects.toThrow(NotFoundError);
      await expect(svc.getById('nonexistent')).rejects.toThrow(
        'Incident with incidentId "nonexistent" not found'
      );
    });
  });

  describe('update', () => {
    it('updates incident successfully', async () => {
      // @ts-ignore
      const existingLeanSpy = jest.fn().mockResolvedValue(baseIncident);
      const updatedIncident = { ...baseIncident, status: 'resolved' as const };
      // @ts-ignore
      const updatedLeanSpy = jest.fn().mockResolvedValue(updatedIncident);

      // @ts-ignore
      jest
        .spyOn(IncidentReportModel, 'findOne')
        // @ts-ignore
        .mockReturnValueOnce({ lean: existingLeanSpy });

      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'findOneAndUpdate').mockReturnValue({
        // @ts-ignore
        lean: updatedLeanSpy,
      });

      const result = await svc.update('incident-123', { status: 'resolved' });

      expect(result).toBeDefined();
      expect(result?.status).toBe('resolved');
      expect(IncidentReportModel.findOneAndUpdate).toHaveBeenCalledWith(
        { incidentId: 'incident-123' },
        { status: 'resolved' },
        { new: true }
      );
    });

    it('returns null when incident not found', async () => {
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(null);
      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'findOne').mockReturnValue({
        // @ts-ignore
        lean: leanSpy,
      });

      const result = await svc.update('nonexistent', { status: 'resolved' });

      expect(result).toBeNull();
    });

    it('validates new theater when theaterId is updated', async () => {
      // @ts-ignore
      const existingLeanSpy = jest.fn().mockResolvedValue(baseIncident);
      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'findOne').mockReturnValue({
        // @ts-ignore
        lean: existingLeanSpy,
      });

      jest.spyOn(movieTheaterService, 'get').mockResolvedValue(null);

      await expect(
        svc.update('incident-123', { theaterId: 'new-theater' })
      ).rejects.toThrow(BadRequestError);

      await expect(
        svc.update('incident-123', { theaterId: 'new-theater' })
      ).rejects.toThrow('Theater with ID "new-theater" does not exist');
    });

    it('validates hall when theaterId is updated', async () => {
      // @ts-ignore
      const existingLeanSpy = jest.fn().mockResolvedValue(baseIncident);
      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'findOne').mockReturnValue({
        // @ts-ignore
        lean: existingLeanSpy,
      });

      jest
        .spyOn(movieTheaterService, 'get')
        .mockResolvedValue(mockTheater as any);
      jest.spyOn(movieHallService, 'get').mockResolvedValue(null);

      await expect(
        svc.update('incident-123', { theaterId: 'new-theater' })
      ).rejects.toThrow(BadRequestError);

      await expect(
        svc.update('incident-123', { theaterId: 'new-theater' })
      ).rejects.toThrow(
        'Hall "hall-1" does not exist in theater "new-theater"'
      );
    });

    it('validates hall when hallId is updated', async () => {
      // @ts-ignore
      const existingLeanSpy = jest.fn().mockResolvedValue(baseIncident);
      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'findOne').mockReturnValue({
        // @ts-ignore
        lean: existingLeanSpy,
      });

      jest.spyOn(movieHallService, 'get').mockResolvedValue(null);

      await expect(
        svc.update('incident-123', { hallId: 'new-hall' })
      ).rejects.toThrow(BadRequestError);

      await expect(
        svc.update('incident-123', { hallId: 'new-hall' })
      ).rejects.toThrow(
        'Hall "new-hall" does not exist in theater "theater-123"'
      );
    });

    it('successfully updates both theaterId and hallId', async () => {
      // @ts-ignore
      const existingLeanSpy = jest.fn().mockResolvedValue(baseIncident);
      const updatedIncident = {
        ...baseIncident,
        theaterId: 'new-theater',
        hallId: 'new-hall',
      };
      // @ts-ignore
      const updatedLeanSpy = jest.fn().mockResolvedValue(updatedIncident);

      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'findOne').mockReturnValue({
        // @ts-ignore
        lean: existingLeanSpy,
      });

      jest
        .spyOn(movieTheaterService, 'get')
        .mockResolvedValue(mockTheater as any);
      jest.spyOn(movieHallService, 'get').mockResolvedValue(mockHall as any);

      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'findOneAndUpdate').mockReturnValue({
        // @ts-ignore
        lean: updatedLeanSpy,
      });

      const result = await svc.update('incident-123', {
        theaterId: 'new-theater',
        hallId: 'new-hall',
      });

      expect(result).toBeDefined();
      expect(result?.theaterId).toBe('new-theater');
      expect(result?.hallId).toBe('new-hall');
    });
  });

  describe('remove', () => {
    it('removes incident successfully', async () => {
      jest
        .spyOn(IncidentReportModel, 'deleteOne')
        .mockResolvedValue({ deletedCount: 1 } as any);

      const result = await svc.remove('incident-123');

      expect(result).toBe(true);
      expect(IncidentReportModel.deleteOne).toHaveBeenCalledWith({
        incidentId: 'incident-123',
      });
    });

    it('returns false when incident not found', async () => {
      jest
        .spyOn(IncidentReportModel, 'deleteOne')
        .mockResolvedValue({ deletedCount: 0 } as any);

      const result = await svc.remove('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('list', () => {
    it('returns paginated list of incidents', async () => {
      // @ts-ignore
      const mockIncidents = [baseIncident];

      // @ts-ignore
      const sortSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const skipSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const limitSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(mockIncidents);

      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'find').mockReturnValue({
        // @ts-ignore
        sort: sortSpy,
        // @ts-ignore
        skip: skipSpy,
        // @ts-ignore
        limit: limitSpy,
        // @ts-ignore
        lean: leanSpy,
      });

      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'countDocuments').mockResolvedValue(1);

      const result = await svc.list({ page: 1, limit: 20 });

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(1);
      expect(result.totalItems).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('handles filters correctly', async () => {
      // @ts-ignore
      const sortSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const skipSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const limitSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue([]);

      // @ts-ignore
      const findSpy = jest.spyOn(IncidentReportModel, 'find').mockReturnValue({
        // @ts-ignore
        sort: sortSpy,
        // @ts-ignore
        skip: skipSpy,
        // @ts-ignore
        limit: limitSpy,
        // @ts-ignore
        lean: leanSpy,
      });

      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'countDocuments').mockResolvedValue(0);

      await svc.list({
        page: 1,
        limit: 20,
        filters: { status: 'open', theaterId: 'theater-123' },
      });

      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'open',
          theaterId: 'theater-123',
        })
      );
    });
  });

  describe('search', () => {
    it('searches incidents with query string', async () => {
      // @ts-ignore
      const mockIncidents = [baseIncident];

      // @ts-ignore
      const sortSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const skipSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const limitSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(mockIncidents);

      // @ts-ignore
      const findSpy = jest.spyOn(IncidentReportModel, 'find').mockReturnValue({
        // @ts-ignore
        sort: sortSpy,
        // @ts-ignore
        skip: skipSpy,
        // @ts-ignore
        limit: limitSpy,
        // @ts-ignore
        lean: leanSpy,
      });

      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'countDocuments').mockResolvedValue(1);

      const result = await svc.search({ q: 'broken', page: 1, limit: 20 });

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          description: { $regex: 'broken', $options: 'i' },
        })
      );
    });

    it('combines query and filters', async () => {
      // @ts-ignore
      const sortSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const skipSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const limitSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue([]);

      // @ts-ignore
      const findSpy = jest.spyOn(IncidentReportModel, 'find').mockReturnValue({
        // @ts-ignore
        sort: sortSpy,
        // @ts-ignore
        skip: skipSpy,
        // @ts-ignore
        limit: limitSpy,
        // @ts-ignore
        lean: leanSpy,
      });

      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'countDocuments').mockResolvedValue(0);

      await svc.search({
        q: 'seat',
        filters: { status: 'open' },
        page: 1,
        limit: 20,
      });

      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'open',
          description: { $regex: 'seat', $options: 'i' },
        })
      );
    });
  });

  describe('getByStatus', () => {
    it('returns incidents filtered by status', async () => {
      // @ts-ignore
      const mockIncidents = [baseIncident];

      // @ts-ignore
      const sortSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const skipSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const limitSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(mockIncidents);

      // @ts-ignore
      const findSpy = jest.spyOn(IncidentReportModel, 'find').mockReturnValue({
        // @ts-ignore
        sort: sortSpy,
        // @ts-ignore
        skip: skipSpy,
        // @ts-ignore
        limit: limitSpy,
        // @ts-ignore
        lean: leanSpy,
      });

      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'countDocuments').mockResolvedValue(1);

      const result = await svc.getByStatus('open', { page: 1, limit: 20 });

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'open' })
      );
    });
  });

  describe('getByLocation', () => {
    it('returns incidents for theater only', async () => {
      // @ts-ignore
      const mockIncidents = [baseIncident];

      // @ts-ignore
      const sortSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const skipSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const limitSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(mockIncidents);

      // @ts-ignore
      const findSpy = jest.spyOn(IncidentReportModel, 'find').mockReturnValue({
        // @ts-ignore
        sort: sortSpy,
        // @ts-ignore
        skip: skipSpy,
        // @ts-ignore
        limit: limitSpy,
        // @ts-ignore
        lean: leanSpy,
      });

      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'countDocuments').mockResolvedValue(1);

      const result = await svc.getByLocation('theater-123', undefined, {
        page: 1,
        limit: 20,
      });

      expect(result).toBeDefined();
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({ theaterId: 'theater-123' })
      );
    });

    it('returns incidents for specific theater and hall', async () => {
      // @ts-ignore
      const mockIncidents = [baseIncident];

      // @ts-ignore
      const sortSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const skipSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const limitSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(mockIncidents);

      // @ts-ignore
      const findSpy = jest.spyOn(IncidentReportModel, 'find').mockReturnValue({
        // @ts-ignore
        sort: sortSpy,
        // @ts-ignore
        skip: skipSpy,
        // @ts-ignore
        limit: limitSpy,
        // @ts-ignore
        lean: leanSpy,
      });

      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'countDocuments').mockResolvedValue(1);

      const result = await svc.getByLocation('theater-123', 'hall-1', {
        page: 1,
        limit: 20,
      });

      expect(result).toBeDefined();
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          theaterId: 'theater-123',
          hallId: 'hall-1',
        })
      );
    });
  });

  describe('getByUser', () => {
    it('returns incidents created by user', async () => {
      // @ts-ignore
      const mockIncidents = [baseIncident];

      // @ts-ignore
      const sortSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const skipSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const limitSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(mockIncidents);

      // @ts-ignore
      const findSpy = jest.spyOn(IncidentReportModel, 'find').mockReturnValue({
        // @ts-ignore
        sort: sortSpy,
        // @ts-ignore
        skip: skipSpy,
        // @ts-ignore
        limit: limitSpy,
        // @ts-ignore
        lean: leanSpy,
      });

      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'countDocuments').mockResolvedValue(1);

      const result = await svc.getByUser('user-123', { page: 1, limit: 20 });

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: 'user-123' })
      );
    });
  });

  describe('getByIncidentId', () => {
    it('returns incidents with specific incidentId', async () => {
      // @ts-ignore
      const mockIncidents = [baseIncident];

      // @ts-ignore
      const sortSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const skipSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const limitSpy = jest.fn().mockReturnThis();
      // @ts-ignore
      const leanSpy = jest.fn().mockResolvedValue(mockIncidents);

      // @ts-ignore
      const findSpy = jest.spyOn(IncidentReportModel, 'find').mockReturnValue({
        // @ts-ignore
        sort: sortSpy,
        // @ts-ignore
        skip: skipSpy,
        // @ts-ignore
        limit: limitSpy,
        // @ts-ignore
        lean: leanSpy,
      });

      // @ts-ignore
      jest.spyOn(IncidentReportModel, 'countDocuments').mockResolvedValue(1);

      const result = await svc.getByIncidentId('incident-123', {
        page: 1,
        limit: 20,
      });

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(findSpy).toHaveBeenCalledWith(
        expect.objectContaining({ incidentId: 'incident-123' })
      );
    });
  });
});
