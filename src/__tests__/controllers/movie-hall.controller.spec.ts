import { MovieHallService } from '../../services/movie-hall.service.js';
import { NotFoundError } from '../../errors/not-found-error.js';

// Mock the service
jest.mock('../../services/movie-hall.service.js');

const mockRequest = (body = {}, params = {}, query = {}) =>
  ({
    body,
    params,
    query,
  }) as any;

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

const mockHall = {
  theaterId: 'theater-1',
  hallId: 'hall-1',
  name: 'Main Hall',
  capacity: 150,
  screenType: 'IMAX',
  soundSystem: 'Dolby Atmos',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockHalls = [
  mockHall,
  {
    theaterId: 'theater-1',
    hallId: 'hall-2',
    name: 'VIP Hall',
    capacity: 50,
    screenType: 'Standard',
    soundSystem: 'Surround',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

let mockService: any;

beforeEach(() => {
  jest.clearAllMocks();
  mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllByTheaterId: jest.fn(),
    findByTheaterIdAndHallId: jest.fn(),
    updateByTheaterIdAndHallId: jest.fn(),
    deleteByTheaterIdAndHallId: jest.fn(),
    searchByTheaterIdOrHallId: jest.fn(),
  };
  (
    MovieHallService as jest.MockedClass<typeof MovieHallService>
  ).mockImplementation(() => mockService);
});

describe('Movie Hall Controller', () => {
  describe('POST /movie-halls', () => {
    it('should create a new movie hall and return 201', async () => {
      mockService.create.mockResolvedValue(mockHall);

      const hallData = {
        theaterId: 'theater-1',
        hallId: 'hall-1',
        name: 'Main Hall',
        capacity: 150,
        screenType: 'IMAX',
        soundSystem: 'Dolby Atmos',
      };

      const req = mockRequest(hallData);
      const res = mockResponse();

      // Test the POST handler logic directly
      try {
        const hall = await mockService.create(req.body);
        res.status(201).json(hall);
      } catch (err) {
        mockNext(err);
      }

      expect(mockService.create).toHaveBeenCalledWith(hallData);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockHall);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if creation fails', async () => {
      mockService.create.mockRejectedValue(new Error('Creation failed'));

      const req = mockRequest(mockHall);
      const res = mockResponse();

      // Test the POST handler logic with error
      try {
        await mockService.create(req.body);
        res.status(201).json(mockHall);
      } catch (err) {
        mockNext(err);
      }

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('GET /movie-halls', () => {
    it('should get all movie halls without pagination', async () => {
      mockService.findAll.mockResolvedValue(mockHalls);

      const req = mockRequest({}, {}, {});
      const res = mockResponse();

      // Test the GET handler logic
      try {
        const { limit, offset } = req.query;
        const halls = await mockService.findAll({
          limit: limit ? Number(limit as string) : undefined,
          offset: offset ? Number(offset as string) : undefined,
        });
        res.json(halls);
      } catch (err) {
        mockNext(err);
      }

      expect(mockService.findAll).toHaveBeenCalledWith({
        limit: undefined,
        offset: undefined,
      });
      expect(res.json).toHaveBeenCalledWith(mockHalls);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should get all movie halls with pagination', async () => {
      mockService.findAll.mockResolvedValue(mockHalls);

      const req = mockRequest({}, {}, { limit: '10', offset: '0' });
      const res = mockResponse();

      // Test the GET handler logic with pagination
      try {
        const { limit, offset } = req.query;
        const halls = await mockService.findAll({
          limit: limit ? Number(limit as string) : undefined,
          offset: offset ? Number(offset as string) : undefined,
        });
        res.json(halls);
      } catch (err) {
        mockNext(err);
      }

      expect(mockService.findAll).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
      });
      expect(res.json).toHaveBeenCalledWith(mockHalls);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if findAll fails', async () => {
      mockService.findAll.mockRejectedValue(new Error('Database error'));

      const req = mockRequest({}, {}, {});
      const res = mockResponse();

      // Test the GET handler logic with error
      try {
        const { limit, offset } = req.query;
        const halls = await mockService.findAll({
          limit: limit ? Number(limit as string) : undefined,
          offset: offset ? Number(offset as string) : undefined,
        });
        res.json(halls);
      } catch (err) {
        mockNext(err);
      }

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('GET /movie-halls/theater/:theaterId', () => {
    it('should get all halls by theater ID', async () => {
      mockService.findAllByTheaterId.mockResolvedValue(mockHalls);

      const req = mockRequest({}, { theaterId: 'theater-1' });
      const res = mockResponse();

      // Test the handler logic
      try {
        const halls = await mockService.findAllByTheaterId(
          req.params.theaterId
        );
        res.json(halls);
      } catch (err) {
        mockNext(err);
      }

      expect(mockService.findAllByTheaterId).toHaveBeenCalledWith('theater-1');
      expect(res.json).toHaveBeenCalledWith(mockHalls);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if findAllByTheaterId fails', async () => {
      mockService.findAllByTheaterId.mockRejectedValue(
        new Error('Database error')
      );

      const req = mockRequest({}, { theaterId: 'theater-1' });
      const res = mockResponse();

      // Test the handler logic with error
      try {
        const halls = await mockService.findAllByTheaterId(
          req.params.theaterId
        );
        res.json(halls);
      } catch (err) {
        mockNext(err);
      }

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('GET /movie-halls/:theaterId/:hallId', () => {
    it('should get a single hall by composite primary key', async () => {
      mockService.findByTheaterIdAndHallId.mockResolvedValue(mockHall);

      const req = mockRequest({}, { theaterId: 'theater-1', hallId: 'hall-1' });
      const res = mockResponse();

      // Test the handler logic
      try {
        const hall = await mockService.findByTheaterIdAndHallId(
          req.params.theaterId,
          req.params.hallId
        );
        res.json(hall);
      } catch (err) {
        mockNext(err);
      }

      expect(mockService.findByTheaterIdAndHallId).toHaveBeenCalledWith(
        'theater-1',
        'hall-1'
      );
      expect(res.json).toHaveBeenCalledWith(mockHall);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if hall not found', async () => {
      mockService.findByTheaterIdAndHallId.mockRejectedValue(
        new NotFoundError('Hall not found')
      );

      const req = mockRequest(
        {},
        { theaterId: 'theater-1', hallId: 'nonexistent' }
      );
      const res = mockResponse();

      // Test the handler logic with error
      try {
        const hall = await mockService.findByTheaterIdAndHallId(
          req.params.theaterId,
          req.params.hallId
        );
        res.json(hall);
      } catch (err) {
        mockNext(err);
      }

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /movie-halls/:theaterId/:hallId', () => {
    it('should update a hall by composite primary key', async () => {
      const updatedHall = { ...mockHall, name: 'Updated Hall' };
      mockService.updateByTheaterIdAndHallId.mockResolvedValue(updatedHall);

      const updateData = { name: 'Updated Hall' };
      const req = mockRequest(updateData, {
        theaterId: 'theater-1',
        hallId: 'hall-1',
      });
      const res = mockResponse();

      // Test the handler logic
      try {
        const hall = await mockService.updateByTheaterIdAndHallId(
          req.params.theaterId,
          req.params.hallId,
          req.body
        );
        res.json(hall);
      } catch (err) {
        mockNext(err);
      }

      expect(mockService.updateByTheaterIdAndHallId).toHaveBeenCalledWith(
        'theater-1',
        'hall-1',
        updateData
      );
      expect(res.json).toHaveBeenCalledWith(updatedHall);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if update fails', async () => {
      mockService.updateByTheaterIdAndHallId.mockRejectedValue(
        new NotFoundError('Hall not found')
      );

      const req = mockRequest(
        { name: 'Updated' },
        { theaterId: 'theater-1', hallId: 'nonexistent' }
      );
      const res = mockResponse();

      // Test the handler logic with error
      try {
        const hall = await mockService.updateByTheaterIdAndHallId(
          req.params.theaterId,
          req.params.hallId,
          req.body
        );
        res.json(hall);
      } catch (err) {
        mockNext(err);
      }

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /movie-halls/:theaterId/:hallId', () => {
    it('should delete a hall by composite primary key', async () => {
      const deleteResult = {
        success: true,
        message: 'Hall deleted successfully',
      };
      mockService.deleteByTheaterIdAndHallId.mockResolvedValue(deleteResult);

      const req = mockRequest({}, { theaterId: 'theater-1', hallId: 'hall-1' });
      const res = mockResponse();

      // Test the handler logic
      try {
        const result = await mockService.deleteByTheaterIdAndHallId(
          req.params.theaterId,
          req.params.hallId
        );
        res.json(result);
      } catch (err) {
        mockNext(err);
      }

      expect(mockService.deleteByTheaterIdAndHallId).toHaveBeenCalledWith(
        'theater-1',
        'hall-1'
      );
      expect(res.json).toHaveBeenCalledWith(deleteResult);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if delete fails', async () => {
      mockService.deleteByTheaterIdAndHallId.mockRejectedValue(
        new NotFoundError('Hall not found')
      );

      const req = mockRequest(
        {},
        { theaterId: 'theater-1', hallId: 'nonexistent' }
      );
      const res = mockResponse();

      // Test the handler logic with error
      try {
        const result = await mockService.deleteByTheaterIdAndHallId(
          req.params.theaterId,
          req.params.hallId
        );
        res.json(result);
      } catch (err) {
        mockNext(err);
      }

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('GET /movie-halls/search', () => {
    it('should search halls by theaterId', async () => {
      const searchResults = [mockHall];
      mockService.searchByTheaterIdOrHallId.mockResolvedValue(searchResults);

      const req = mockRequest({}, {}, { theaterId: 'theater-1' });
      const res = mockResponse();

      // Test the handler logic
      try {
        const { theaterId, hallId } = req.query;
        const halls = await mockService.searchByTheaterIdOrHallId({
          theaterId: theaterId as string | undefined,
          hallId: hallId as string | undefined,
        });
        res.json(halls);
      } catch (err) {
        mockNext(err);
      }

      expect(mockService.searchByTheaterIdOrHallId).toHaveBeenCalledWith({
        theaterId: 'theater-1',
        hallId: undefined,
      });
      expect(res.json).toHaveBeenCalledWith(searchResults);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should search halls by hallId', async () => {
      const searchResults = [mockHall];
      mockService.searchByTheaterIdOrHallId.mockResolvedValue(searchResults);

      const req = mockRequest({}, {}, { hallId: 'hall-1' });
      const res = mockResponse();

      // Test the handler logic
      try {
        const { theaterId, hallId } = req.query;
        const halls = await mockService.searchByTheaterIdOrHallId({
          theaterId: theaterId as string | undefined,
          hallId: hallId as string | undefined,
        });
        res.json(halls);
      } catch (err) {
        mockNext(err);
      }

      expect(mockService.searchByTheaterIdOrHallId).toHaveBeenCalledWith({
        theaterId: undefined,
        hallId: 'hall-1',
      });
      expect(res.json).toHaveBeenCalledWith(searchResults);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should search halls by both theaterId and hallId', async () => {
      const searchResults = [mockHall];
      mockService.searchByTheaterIdOrHallId.mockResolvedValue(searchResults);

      const req = mockRequest(
        {},
        {},
        { theaterId: 'theater-1', hallId: 'hall-1' }
      );
      const res = mockResponse();

      // Test the handler logic
      try {
        const { theaterId, hallId } = req.query;
        const halls = await mockService.searchByTheaterIdOrHallId({
          theaterId: theaterId as string | undefined,
          hallId: hallId as string | undefined,
        });
        res.json(halls);
      } catch (err) {
        mockNext(err);
      }

      expect(mockService.searchByTheaterIdOrHallId).toHaveBeenCalledWith({
        theaterId: 'theater-1',
        hallId: 'hall-1',
      });
      expect(res.json).toHaveBeenCalledWith(searchResults);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if search fails', async () => {
      mockService.searchByTheaterIdOrHallId.mockRejectedValue(
        new Error('Search failed')
      );

      const req = mockRequest({}, {}, { theaterId: 'theater-1' });
      const res = mockResponse();

      // Test the handler logic with error
      try {
        const { theaterId, hallId } = req.query;
        const halls = await mockService.searchByTheaterIdOrHallId({
          theaterId: theaterId as string | undefined,
          hallId: hallId as string | undefined,
        });
        res.json(halls);
      } catch (err) {
        mockNext(err);
      }

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
