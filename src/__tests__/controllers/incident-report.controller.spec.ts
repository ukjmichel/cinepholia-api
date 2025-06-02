import * as incidentReportController from '../../controllers/incident-report.controller.js';
import { IncidentReportService } from '../../services/incident-report.service.js';
import { NotFoundError } from '../../errors/not-found-error.js';
import { BadRequestError } from '../../errors/bad-request-error.js';

jest.mock('../../services/incident-report.service.js');

const mockRequest = (body = {}, params = {}, query = {}) =>
  ({ body, params, query }) as any;

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

const mockIncidentReport = {
  incidentId: 'incident-1',
  theaterId: 'theater-1',
  hallId: 'hall-1',
  title: 'Broken seat in row A',
  description: 'Seat A2 is completely broken and cannot be used by customers.',
  status: 'pending',
  date: '2025-01-15T10:00:00Z',
  userId: 'user-1',
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T10:00:00Z',
};

const mockIncidentReports = [mockIncidentReport];

const mockStatistics = {
  total: 10,
  pending: 5,
  inProgress: 3,
  fulfilled: 2,
  byTheater: {
    'theater-1': 5,
    'theater-2': 5,
  },
};

// Mock the service constructor and methods
const mockServiceInstance = {
  findById: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  deleteById: jest.fn(),
  findAll: jest.fn(),
  findAllByTheaterId: jest.fn(),
  findAllByHall: jest.fn(),
  findAllByUserId: jest.fn(),
  findAllByStatus: jest.fn(),
  updateStatus: jest.fn(),
  search: jest.fn(),
  getStatistics: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (IncidentReportService as jest.Mock).mockImplementation(
    () => mockServiceInstance
  );
});

describe('IncidentReportController', () => {
  describe('getIncidentReportById', () => {
    it('should return an incident report by id', async () => {
      mockServiceInstance.findById.mockResolvedValue(mockIncidentReport);
      const req = mockRequest({}, { incidentId: 'incident-1' });
      const res = mockResponse();

      await incidentReportController.getIncidentReportById(req, res, mockNext);

      expect(mockServiceInstance.findById).toHaveBeenCalledWith('incident-1');
      expect(res.json).toHaveBeenCalledWith({
        message: 'Incident report found',
        data: mockIncidentReport,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError if not found', async () => {
      mockServiceInstance.findById.mockRejectedValue(
        new NotFoundError('Incident report not found')
      );
      const req = mockRequest({}, { incidentId: '404' });
      const res = mockResponse();

      await incidentReportController.getIncidentReportById(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('createIncidentReport', () => {
    it('should create an incident report and return 201', async () => {
      mockServiceInstance.create.mockResolvedValue(mockIncidentReport);
      const req = mockRequest({
        theaterId: 'theater-1',
        hallId: 'hall-1',
        title: 'Audio system malfunction',
        description: 'The audio system is not working properly.',
        userId: 'user-1',
      });
      const res = mockResponse();

      await incidentReportController.createIncidentReport(req, res, mockNext);

      expect(mockServiceInstance.create).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Incident report created',
        data: mockIncidentReport,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if creation fails', async () => {
      mockServiceInstance.create.mockRejectedValue(
        new Error('Creation failed')
      );
      const req = mockRequest({ theaterId: 'invalid' });
      const res = mockResponse();

      await incidentReportController.createIncidentReport(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalledWith(201);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('updateIncidentReport', () => {
    it('should update and return an incident report', async () => {
      const updatedIncident = { ...mockIncidentReport, title: 'Updated title' };
      mockServiceInstance.updateById.mockResolvedValue(updatedIncident);
      const req = mockRequest(
        { title: 'Updated title' },
        { incidentId: 'incident-1' }
      );
      const res = mockResponse();

      await incidentReportController.updateIncidentReport(req, res, mockNext);

      expect(mockServiceInstance.updateById).toHaveBeenCalledWith(
        'incident-1',
        {
          title: 'Updated title',
        }
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Incident report updated',
        data: updatedIncident,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError if not found', async () => {
      mockServiceInstance.updateById.mockRejectedValue(
        new NotFoundError('Incident report not found')
      );
      const req = mockRequest({ title: 'Updated' }, { incidentId: 'bad' });
      const res = mockResponse();

      await incidentReportController.updateIncidentReport(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('deleteIncidentReport', () => {
    it('should delete an incident report and return 204', async () => {
      mockServiceInstance.deleteById.mockResolvedValue({
        message: 'Incident report deleted',
      });
      const req = mockRequest({}, { incidentId: 'incident-1' });
      const res = mockResponse();

      await incidentReportController.deleteIncidentReport(req, res, mockNext);

      expect(mockServiceInstance.deleteById).toHaveBeenCalledWith('incident-1');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError if not found', async () => {
      mockServiceInstance.deleteById.mockRejectedValue(
        new NotFoundError('Incident report not found')
      );
      const req = mockRequest({}, { incidentId: 'fail' });
      const res = mockResponse();

      await incidentReportController.deleteIncidentReport(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.status).not.toHaveBeenCalledWith(204);
    });
  });

  describe('getAllIncidentReports', () => {
    it('should return all incident reports', async () => {
      mockServiceInstance.findAll.mockResolvedValue(mockIncidentReports);
      const req = mockRequest();
      const res = mockResponse();

      await incidentReportController.getAllIncidentReports(req, res, mockNext);

      expect(mockServiceInstance.findAll).toHaveBeenCalledWith({
        limit: undefined,
        offset: undefined,
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'All incident reports',
        data: mockIncidentReports,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return incident reports with pagination', async () => {
      mockServiceInstance.findAll.mockResolvedValue(mockIncidentReports);
      const req = mockRequest({}, {}, { limit: '10', offset: '5' });
      const res = mockResponse();

      await incidentReportController.getAllIncidentReports(req, res, mockNext);

      expect(mockServiceInstance.findAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 5,
      });
      expect(res.json).toHaveBeenCalledWith({
        message: 'All incident reports',
        data: mockIncidentReports,
      });
    });

    it('should call next if error thrown', async () => {
      mockServiceInstance.findAll.mockRejectedValue(
        new Error('Database error')
      );
      const req = mockRequest();
      const res = mockResponse();

      await incidentReportController.getAllIncidentReports(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getIncidentReportsByTheater', () => {
    it('should return incident reports for a theater', async () => {
      mockServiceInstance.findAllByTheaterId.mockResolvedValue(
        mockIncidentReports
      );
      const req = mockRequest({}, { theaterId: 'theater-1' });
      const res = mockResponse();

      await incidentReportController.getIncidentReportsByTheater(
        req,
        res,
        mockNext
      );

      expect(mockServiceInstance.findAllByTheaterId).toHaveBeenCalledWith(
        'theater-1'
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Incident reports for theater',
        data: mockIncidentReports,
      });
    });

    it('should call next with NotFoundError if theater not found', async () => {
      mockServiceInstance.findAllByTheaterId.mockRejectedValue(
        new NotFoundError('Theater not found')
      );
      const req = mockRequest({}, { theaterId: 'invalid' });
      const res = mockResponse();

      await incidentReportController.getIncidentReportsByTheater(
        req,
        res,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('getIncidentReportsByHall', () => {
    it('should return incident reports for a hall', async () => {
      mockServiceInstance.findAllByHall.mockResolvedValue(mockIncidentReports);
      const req = mockRequest({}, { theaterId: 'theater-1', hallId: 'hall-1' });
      const res = mockResponse();

      await incidentReportController.getIncidentReportsByHall(
        req,
        res,
        mockNext
      );

      expect(mockServiceInstance.findAllByHall).toHaveBeenCalledWith(
        'theater-1',
        'hall-1'
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Incident reports for hall',
        data: mockIncidentReports,
      });
    });

    it('should call next with NotFoundError if hall not found', async () => {
      mockServiceInstance.findAllByHall.mockRejectedValue(
        new NotFoundError('Hall not found')
      );
      const req = mockRequest(
        {},
        { theaterId: 'theater-1', hallId: 'invalid' }
      );
      const res = mockResponse();

      await incidentReportController.getIncidentReportsByHall(
        req,
        res,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('getIncidentReportsByUser', () => {
    it('should return incident reports for a user', async () => {
      mockServiceInstance.findAllByUserId.mockResolvedValue(
        mockIncidentReports
      );
      const req = mockRequest({}, { userId: 'user-1' });
      const res = mockResponse();

      await incidentReportController.getIncidentReportsByUser(
        req,
        res,
        mockNext
      );

      expect(mockServiceInstance.findAllByUserId).toHaveBeenCalledWith(
        'user-1'
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Incident reports for user',
        data: mockIncidentReports,
      });
    });

    it('should call next with NotFoundError if user not found', async () => {
      mockServiceInstance.findAllByUserId.mockRejectedValue(
        new NotFoundError('User not found')
      );
      const req = mockRequest({}, { userId: 'invalid' });
      const res = mockResponse();

      await incidentReportController.getIncidentReportsByUser(
        req,
        res,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('getIncidentReportsByStatus', () => {
    it('should return incident reports by status', async () => {
      mockServiceInstance.findAllByStatus.mockResolvedValue(
        mockIncidentReports
      );
      const req = mockRequest({}, { status: 'pending' });
      const res = mockResponse();

      await incidentReportController.getIncidentReportsByStatus(
        req,
        res,
        mockNext
      );

      expect(mockServiceInstance.findAllByStatus).toHaveBeenCalledWith(
        'pending'
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Incident reports with status pending',
        data: mockIncidentReports,
      });
    });

    it('should call next with NotFoundError if no incidents found', async () => {
      mockServiceInstance.findAllByStatus.mockRejectedValue(
        new NotFoundError('No incidents found with this status')
      );
      const req = mockRequest({}, { status: 'fulfilled' });
      const res = mockResponse();

      await incidentReportController.getIncidentReportsByStatus(
        req,
        res,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('updateIncidentReportStatus', () => {
    it('should update incident report status', async () => {
      const updatedIncident = { ...mockIncidentReport, status: 'in_progress' };
      mockServiceInstance.updateStatus.mockResolvedValue(updatedIncident);
      const req = mockRequest(
        { status: 'in_progress' },
        { incidentId: 'incident-1' }
      );
      const res = mockResponse();

      await incidentReportController.updateIncidentReportStatus(
        req,
        res,
        mockNext
      );

      expect(mockServiceInstance.updateStatus).toHaveBeenCalledWith(
        'incident-1',
        'in_progress'
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Incident report status updated',
        data: updatedIncident,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with BadRequestError if status is missing', async () => {
      const req = mockRequest({}, { incidentId: 'incident-1' });
      const res = mockResponse();

      await incidentReportController.updateIncidentReportStatus(
        req,
        res,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
      const errorArg = mockNext.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(BadRequestError);
      expect(errorArg.message).toBe('Status is required in request body');
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should call next with BadRequestError if status is invalid', async () => {
      const req = mockRequest(
        { status: 'invalid_status' },
        { incidentId: 'incident-1' }
      );
      const res = mockResponse();

      await incidentReportController.updateIncidentReportStatus(
        req,
        res,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
      const errorArg = mockNext.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(BadRequestError);
      expect(errorArg.message).toBe(
        'Status must be one of: pending, in_progress, fulfilled'
      );
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError if incident not found', async () => {
      mockServiceInstance.updateStatus.mockRejectedValue(
        new NotFoundError('Incident report not found')
      );
      const req = mockRequest(
        { status: 'fulfilled' },
        { incidentId: 'invalid' }
      );
      const res = mockResponse();

      await incidentReportController.updateIncidentReportStatus(
        req,
        res,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('searchIncidentReports', () => {
    it('should return incident reports matching the search criteria', async () => {
      mockServiceInstance.search.mockResolvedValue(mockIncidentReports);
      const req = mockRequest(
        {},
        {},
        {
          title: 'broken',
          status: 'pending',
          limit: '10',
        }
      );
      const res = mockResponse();

      await incidentReportController.searchIncidentReports(req, res, mockNext);

      expect(mockServiceInstance.search).toHaveBeenCalledWith(
        { title: 'broken', status: 'pending' },
        { limit: 10 }
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Incident reports search results',
        data: mockIncidentReports,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should search with date range parameters', async () => {
      mockServiceInstance.search.mockResolvedValue(mockIncidentReports);
      const req = mockRequest(
        {},
        {},
        {
          dateFrom: '2025-01-01',
          dateTo: '2025-01-31',
          theaterId: 'theater-1',
        }
      );
      const res = mockResponse();

      await incidentReportController.searchIncidentReports(req, res, mockNext);

      expect(mockServiceInstance.search).toHaveBeenCalledWith(
        {
          dateFrom: new Date('2025-01-01'),
          dateTo: new Date('2025-01-31'),
          theaterId: 'theater-1',
        },
        {}
      );
    });

    it('should call next with BadRequestError if no search parameters provided', async () => {
      const req = mockRequest({}, {}, {});
      const res = mockResponse();

      await incidentReportController.searchIncidentReports(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      const errorArg = mockNext.mock.calls[0][0];
      expect(errorArg).toBeInstanceOf(BadRequestError);
      expect(errorArg.message).toBe(
        'At least one search parameter is required'
      );
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should call next if search fails', async () => {
      mockServiceInstance.search.mockRejectedValue(new Error('Search failed'));
      const req = mockRequest({}, {}, { title: 'broken' });
      const res = mockResponse();

      await incidentReportController.searchIncidentReports(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getIncidentReportStatistics', () => {
    it('should return incident report statistics', async () => {
      mockServiceInstance.getStatistics.mockResolvedValue(mockStatistics);
      const req = mockRequest();
      const res = mockResponse();

      await incidentReportController.getIncidentReportStatistics(
        req,
        res,
        mockNext
      );

      expect(mockServiceInstance.getStatistics).toHaveBeenCalledWith(undefined);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Incident report statistics',
        data: mockStatistics,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return statistics filtered by theater', async () => {
      const theaterStats = {
        total: 5,
        pending: 2,
        inProgress: 2,
        fulfilled: 1,
      };
      mockServiceInstance.getStatistics.mockResolvedValue(theaterStats);
      const req = mockRequest({}, {}, { theaterId: 'theater-1' });
      const res = mockResponse();

      await incidentReportController.getIncidentReportStatistics(
        req,
        res,
        mockNext
      );

      expect(mockServiceInstance.getStatistics).toHaveBeenCalledWith(
        'theater-1'
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Incident report statistics',
        data: theaterStats,
      });
    });

    it('should call next if error thrown', async () => {
      mockServiceInstance.getStatistics.mockRejectedValue(
        new Error('Stats error')
      );
      const req = mockRequest();
      const res = mockResponse();

      await incidentReportController.getIncidentReportStatistics(
        req,
        res,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
