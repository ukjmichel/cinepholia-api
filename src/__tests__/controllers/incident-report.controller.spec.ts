import { Request, Response, NextFunction } from 'express';
import { IncidentReportController } from '../../controllers/incident-report.controller';
import { incidentReportService } from '../../services/incident-report.service';
import { NotFoundError } from '../../errors/not-found-error';

// Mock dependencies
jest.mock('../../services/incident-report.service');

describe('IncidentReportController', () => {
  let controller: IncidentReportController;
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  const mockIncident = {
    incidentId: 'incident-123',
    theaterId: 'theater-456',
    hallId: 'hall-789',
    description: 'Broken projector in hall 3',
    status: 'open',
    createdBy: 'user-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    controller = new IncidentReportController();

    mockRequest = {
      params: {},
      query: {},
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('createIncident', () => {
    it('should create incident with all fields', async () => {
      mockRequest.body = {
        incidentId: 'incident-123',
        theaterId: 'theater-456',
        hallId: 'hall-789',
        description: 'Broken projector',
        status: 'open',
        createdBy: 'user-001',
      };

      (incidentReportService.create as jest.Mock).mockResolvedValue(
        mockIncident
      );

      await controller.createIncident(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(incidentReportService.create).toHaveBeenCalledWith({
        incidentId: 'incident-123',
        theaterId: 'theater-456',
        hallId: 'hall-789',
        description: 'Broken projector',
        status: 'open',
        createdBy: 'user-001',
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Incident report created successfully',
        data: { incident: mockIncident },
      });
    });

    it('should create incident with default status if not provided', async () => {
      mockRequest.body = {
        theaterId: 'theater-456',
        hallId: 'hall-789',
        description: 'Broken projector',
        createdBy: 'user-001',
      };

      (incidentReportService.create as jest.Mock).mockResolvedValue(
        mockIncident
      );

      await controller.createIncident(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(incidentReportService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'open',
        })
      );
    });

    it('should call next with error on failure', async () => {
      mockRequest.body = {
        theaterId: 'theater-456',
        description: 'Test',
        createdBy: 'user-001',
      };

      const error = new Error('Database error');
      (incidentReportService.create as jest.Mock).mockRejectedValue(error);

      await controller.createIncident(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('listIncidents', () => {
    it('should list incidents with pagination', async () => {
      mockRequest.query = { page: '2', pageSize: '10' };

      const mockResult = {
        items: [mockIncident],
        totalItems: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      };

      (incidentReportService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listIncidents(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(incidentReportService.list).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        filters: expect.any(Object),
        sortBy: undefined,
        sortDir: undefined,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Incidents found successfully',
        data: {
          incidents: [mockIncident],
          total: 25,
          page: 2,
          pageSize: 10,
          totalPages: 3,
        },
      });
    });

    it('should list incidents with filters', async () => {
      mockRequest.query = {
        status: 'open',
        theaterId: 'theater-456',
        hallId: 'hall-789',
        createdBy: 'user-001',
        createdAtFrom: '2025-01-01',
        createdAtTo: '2025-01-31',
      };

      const mockResult = {
        items: [mockIncident],
        totalItems: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (incidentReportService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listIncidents(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(incidentReportService.list).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        filters: {
          incidentId: undefined,
          status: 'open',
          theaterId: 'theater-456',
          hallId: 'hall-789',
          createdBy: 'user-001',
          createdAtFrom: '2025-01-01',
          createdAtTo: '2025-01-31',
          updatedAtFrom: undefined,
          updatedAtTo: undefined,
        },
        sortBy: undefined,
        sortDir: undefined,
      });
    });

    it('should handle sorting parameters', async () => {
      mockRequest.query = {
        sortBy: 'createdAt',
        sortDir: 'desc',
      };

      const mockResult = {
        items: [],
        totalItems: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      (incidentReportService.list as jest.Mock).mockResolvedValue(mockResult);

      await controller.listIncidents(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(incidentReportService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'createdAt',
          sortDir: 'desc',
        })
      );
    });
  });

  describe('searchIncidents', () => {
    it('should search incidents with query string', async () => {
      mockRequest.query = { q: 'broken projector' };

      const mockResult = {
        items: [mockIncident],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (incidentReportService.search as jest.Mock).mockResolvedValue(mockResult);

      await controller.searchIncidents(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(incidentReportService.search).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        q: 'broken projector',
        filters: {},
        sortBy: undefined,
        sortDir: undefined,
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Incidents found successfully',
        data: {
          incidents: [mockIncident],
          total: 1,
          page: 1,
          pageSize: 20,
          totalPages: 1,
          query: 'broken projector',
        },
      });
    });

    it('should search with filters and pagination', async () => {
      mockRequest.query = {
        q: 'projector',
        page: '2',
        pageSize: '15',
        status: 'open',
        theaterId: 'theater-456',
      };

      const mockResult = {
        items: [mockIncident],
        total: 30,
        page: 2,
        limit: 15,
        totalPages: 2,
      };

      (incidentReportService.search as jest.Mock).mockResolvedValue(mockResult);

      await controller.searchIncidents(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(incidentReportService.search).toHaveBeenCalledWith({
        page: 2,
        limit: 15,
        q: 'projector',
        filters: {
          status: 'open',
          theaterId: 'theater-456',
        },
        sortBy: undefined,
        sortDir: undefined,
      });
    });

    it('should handle page beyond total pages by refetching last page', async () => {
      mockRequest.query = { page: '10', pageSize: '20' };

      const mockResult = {
        items: [mockIncident],
        total: 25,
        page: 2,
        limit: 20,
        totalPages: 2,
      };

      (incidentReportService.search as jest.Mock)
        .mockResolvedValueOnce({ items: [], total: 25, page: 10, limit: 20 })
        .mockResolvedValueOnce(mockResult);

      await controller.searchIncidents(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(incidentReportService.search).toHaveBeenCalledTimes(2);
      expect(incidentReportService.search).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });

    it('should normalize invalid pagination parameters', async () => {
      mockRequest.query = { page: '-1', pageSize: '500' };

      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 100,
        totalPages: 0,
      };

      (incidentReportService.search as jest.Mock).mockResolvedValue(mockResult);

      await controller.searchIncidents(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(incidentReportService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1, // Normalized from -1
          limit: 100, // Capped at 100
        })
      );
    });

    it('should trim filter values', async () => {
      mockRequest.query = {
        theaterId: '  theater-456  ',
        hallId: '  hall-789  ',
      };

      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };

      (incidentReportService.search as jest.Mock).mockResolvedValue(mockResult);

      await controller.searchIncidents(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(incidentReportService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: {
            theaterId: 'theater-456',
            hallId: 'hall-789',
          },
        })
      );
    });
  });

  describe('getIncidentById', () => {
    it('should return incident by ID', async () => {
      mockRequest.params = { incidentId: 'incident-123' };

      (incidentReportService.get as jest.Mock).mockResolvedValue(mockIncident);

      await controller.getIncidentById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(incidentReportService.get).toHaveBeenCalledWith('incident-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Incident found successfully',
        data: { incident: mockIncident },
      });
    });

    it('should throw NotFoundError if incident does not exist', async () => {
      mockRequest.params = { incidentId: 'non-existent' };

      (incidentReportService.get as jest.Mock).mockResolvedValue(null);

      await controller.getIncidentById(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });

  describe('updateIncident', () => {
    it('should update incident with provided fields', async () => {
      mockRequest.params = { incidentId: 'incident-123' };
      mockRequest.body = {
        description: 'Updated description',
        status: 'resolved',
      };

      const updatedIncident = {
        ...mockIncident,
        description: 'Updated description',
        status: 'resolved',
      };

      (incidentReportService.update as jest.Mock).mockResolvedValue(
        updatedIncident
      );

      await controller.updateIncident(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(incidentReportService.update).toHaveBeenCalledWith(
        'incident-123',
        {
          description: 'Updated description',
          status: 'resolved',
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Incident updated successfully',
        data: { incident: updatedIncident },
      });
    });

    it('should only update provided fields', async () => {
      mockRequest.params = { incidentId: 'incident-123' };
      mockRequest.body = { status: 'in_progress' };

      (incidentReportService.update as jest.Mock).mockResolvedValue(
        mockIncident
      );

      await controller.updateIncident(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(incidentReportService.update).toHaveBeenCalledWith(
        'incident-123',
        {
          status: 'in_progress',
        }
      );
    });

    it('should throw NotFoundError if incident does not exist', async () => {
      mockRequest.params = { incidentId: 'non-existent' };
      mockRequest.body = { status: 'resolved' };

      (incidentReportService.update as jest.Mock).mockResolvedValue(null);

      await controller.updateIncident(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });

  describe('deleteIncident', () => {
    it('should delete incident successfully', async () => {
      mockRequest.params = { incidentId: 'incident-123' };

      (incidentReportService.remove as jest.Mock).mockResolvedValue(true);

      await controller.deleteIncident(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(incidentReportService.remove).toHaveBeenCalledWith('incident-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Incident deleted successfully',
        data: null,
      });
    });

    it('should throw NotFoundError if incident does not exist', async () => {
      mockRequest.params = { incidentId: 'non-existent' };

      (incidentReportService.remove as jest.Mock).mockResolvedValue(false);

      await controller.deleteIncident(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    });
  });

  describe('getIncidentsByStatus', () => {
    it('should return incidents filtered by status', async () => {
      mockRequest.params = { status: 'open' };
      mockRequest.query = { page: '1', pageSize: '10' };

      const mockResult = {
        items: [mockIncident],
        totalItems: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      (incidentReportService.getByStatus as jest.Mock).mockResolvedValue(
        mockResult
      );

      await controller.getIncidentsByStatus(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(incidentReportService.getByStatus).toHaveBeenCalledWith('open', {
        page: 1,
        limit: 10,
        sortBy: undefined,
        sortDir: undefined,
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Incidents by status found successfully',
        data: expect.objectContaining({
          status: 'open',
        }),
      });
    });
  });

  describe('getIncidentsByLocation', () => {
    it('should return incidents filtered by theater', async () => {
      mockRequest.params = { theaterId: 'theater-456' };
      mockRequest.query = {};

      const mockResult = {
        items: [mockIncident],
        totalItems: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (incidentReportService.getByLocation as jest.Mock).mockResolvedValue(
        mockResult
      );

      await controller.getIncidentsByLocation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(incidentReportService.getByLocation).toHaveBeenCalledWith(
        'theater-456',
        undefined,
        expect.any(Object)
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Incidents by location found successfully',
        data: expect.objectContaining({
          theaterId: 'theater-456',
          hallId: undefined,
        }),
      });
    });

    it('should return incidents filtered by theater and hall', async () => {
      mockRequest.params = { theaterId: 'theater-456' };
      mockRequest.query = { hallId: 'hall-789' };

      const mockResult = {
        items: [mockIncident],
        totalItems: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (incidentReportService.getByLocation as jest.Mock).mockResolvedValue(
        mockResult
      );

      await controller.getIncidentsByLocation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(incidentReportService.getByLocation).toHaveBeenCalledWith(
        'theater-456',
        'hall-789',
        expect.any(Object)
      );
    });
  });

  describe('getIncidentsByUser', () => {
    it('should return incidents created by user', async () => {
      mockRequest.params = { userId: 'user-001' };
      mockRequest.query = { page: '1', pageSize: '20' };

      const mockResult = {
        items: [mockIncident],
        totalItems: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (incidentReportService.getByUser as jest.Mock).mockResolvedValue(
        mockResult
      );

      await controller.getIncidentsByUser(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(incidentReportService.getByUser).toHaveBeenCalledWith('user-001', {
        page: 1,
        limit: 20,
        sortBy: undefined,
        sortDir: undefined,
      });
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Incidents by user found successfully',
        data: expect.objectContaining({
          userId: 'user-001',
        }),
      });
    });
  });

  describe('getIncidentsByIncidentId', () => {
    it('should return incidents with specific incidentId', async () => {
      mockRequest.params = { incidentId: 'incident-123' };
      mockRequest.query = {};

      const mockResult = {
        items: [mockIncident],
        totalItems: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };

      (incidentReportService.getByIncidentId as jest.Mock).mockResolvedValue(
        mockResult
      );

      await controller.getIncidentsByIncidentId(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(incidentReportService.getByIncidentId).toHaveBeenCalledWith(
        'incident-123',
        {
          page: undefined,
          limit: undefined,
          sortBy: undefined,
          sortDir: undefined,
        }
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Incidents found successfully',
        data: expect.objectContaining({
          incidentId: 'incident-123',
        }),
      });
    });
  });

  describe('Error handling', () => {
    it('should call next with error on service failure in listIncidents', async () => {
      const error = new Error('Service error');
      (incidentReportService.list as jest.Mock).mockRejectedValue(error);

      await controller.listIncidents(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should call next with error on service failure in searchIncidents', async () => {
      const error = new Error('Search error');
      (incidentReportService.search as jest.Mock).mockRejectedValue(error);

      await controller.searchIncidents(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
