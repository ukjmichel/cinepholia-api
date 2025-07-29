import * as screeningController from '../../controllers/screening.controller.js';
import { screeningService } from '../../services/screening.service.js';
import { NotFoundError } from '../../errors/not-found-error.js';

jest.mock('../../services/screening.service.js');

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

const mockScreening = {
  screeningId: 's-1',
  movieId: 'm-1',
  theaterId: 't-1',
  hallId: 'h-1',
  startTime: '2025-01-01T20:00:00Z',
  price: 10.5,
  quality: 'IMAX',
  movie: { title: 'Inception' },
  theater: { city: 'Paris' },
  hall: { hallId: 'h-1' },
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const mockScreenings = [mockScreening];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ScreeningController', () => {
  describe('getScreeningById', () => {
    it('should return a screening by id', async () => {
      (screeningService.getScreeningById as jest.Mock).mockResolvedValue(
        mockScreening
      );

      const req = mockRequest({}, { screeningId: 's-1' });
      const res = mockResponse();

      await screeningController.getScreeningById(req, res, mockNext);

      expect(screeningService.getScreeningById).toHaveBeenCalledWith('s-1');
      expect(res.json).toHaveBeenCalledWith(mockScreening);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError if not found', async () => {
      (screeningService.getScreeningById as jest.Mock).mockRejectedValue(
        new NotFoundError('not found')
      );

      const req = mockRequest({}, { screeningId: '404' });
      const res = mockResponse();

      await screeningController.getScreeningById(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('createScreening', () => {
    it('should create a screening and return 201', async () => {
      (screeningService.createScreening as jest.Mock).mockResolvedValue(
        mockScreening
      );

      const req = mockRequest({
        movieId: 'm-1',
        theaterId: 't-1',
        hallId: 'h-1',
        startTime: '2025-01-01T20:00:00Z',
        price: 10.5,
        quality: 'IMAX',
      });
      const res = mockResponse();

      await screeningController.createScreening(req, res, mockNext);

      expect(screeningService.createScreening).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockScreening);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error if creation fails', async () => {
      (screeningService.createScreening as jest.Mock).mockRejectedValue(
        new Error('fail')
      );

      const req = mockRequest({ movieId: 'bad' });
      const res = mockResponse();

      await screeningController.createScreening(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('updateScreening', () => {
    it('should update and return a screening', async () => {
      (screeningService.updateScreening as jest.Mock).mockResolvedValue({
        ...mockScreening,
        quality: '3D',
      });

      const req = mockRequest({ quality: '3D' }, { screeningId: 's-1' });
      const res = mockResponse();

      await screeningController.updateScreening(req, res, mockNext);

      expect(screeningService.updateScreening).toHaveBeenCalledWith('s-1', {
        quality: '3D',
      });
      expect(res.json).toHaveBeenCalledWith({
        ...mockScreening,
        quality: '3D',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError if not found', async () => {
      (screeningService.updateScreening as jest.Mock).mockRejectedValue(
        new NotFoundError('nf')
      );

      const req = mockRequest(
        { quality: 'Dolby' },
        { screeningId: 'not-found' }
      );
      const res = mockResponse();

      await screeningController.updateScreening(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('deleteScreening', () => {
    it('should delete a screening and return 204', async () => {
      (screeningService.deleteScreening as jest.Mock).mockResolvedValue(
        undefined
      );

      const req = mockRequest({}, { screeningId: 's-1' });
      const res = mockResponse();

      await screeningController.deleteScreening(req, res, mockNext);

      expect(screeningService.deleteScreening).toHaveBeenCalledWith('s-1');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with NotFoundError if not found', async () => {
      (screeningService.deleteScreening as jest.Mock).mockRejectedValue(
        new NotFoundError('not found')
      );

      const req = mockRequest({}, { screeningId: 'fail' });
      const res = mockResponse();

      await screeningController.deleteScreening(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(res.status).not.toHaveBeenCalledWith(204);
    });
  });

  describe('getAllScreenings', () => {
    it('should return all screenings', async () => {
      (screeningService.getAllScreenings as jest.Mock).mockResolvedValue(
        mockScreenings
      );

      const req = mockRequest();
      const res = mockResponse();

      await screeningController.getAllScreenings(req, res, mockNext);

      expect(screeningService.getAllScreenings).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockScreenings);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next if error thrown', async () => {
      (screeningService.getAllScreenings as jest.Mock).mockRejectedValue(
        new Error('fail')
      );

      const req = mockRequest();
      const res = mockResponse();

      await screeningController.getAllScreenings(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('searchScreenings', () => {
    it('should search screenings', async () => {
      (screeningService.searchScreenings as jest.Mock).mockResolvedValue(
        mockScreenings
      );

      const req = mockRequest({}, {}, { q: 'IMAX' });
      const res = mockResponse();

      await screeningController.searchScreenings(req, res, mockNext);

      expect(screeningService.searchScreenings).toHaveBeenCalledWith('IMAX');
      expect(res.json).toHaveBeenCalledWith({
        message: 'ok',
        data: mockScreenings,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next if error thrown', async () => {
      (screeningService.searchScreenings as jest.Mock).mockRejectedValue(
        new Error('fail')
      );

      const req = mockRequest({}, {}, { q: 'fail' });
      const res = mockResponse();

      await screeningController.searchScreenings(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getScreeningsByMovieId', () => {
    it('should return screenings for a movie', async () => {
      (screeningService.getScreeningsByMovieId as jest.Mock).mockResolvedValue(
        mockScreenings
      );

      const req = mockRequest({}, { movieId: 'm-1' });
      const res = mockResponse();

      await screeningController.getScreeningsByMovieId(req, res, mockNext);

      expect(screeningService.getScreeningsByMovieId).toHaveBeenCalledWith(
        'm-1'
      );
      expect(res.json).toHaveBeenCalledWith(mockScreenings);
    });
  });

  describe('getScreeningsByTheaterId', () => {
    it('should return screenings for a theater', async () => {
      (
        screeningService.getScreeningsByTheaterId as jest.Mock
      ).mockResolvedValue(mockScreenings);

      const req = mockRequest({}, { theaterId: 't-1' });
      const res = mockResponse();

      await screeningController.getScreeningsByTheaterId(req, res, mockNext);

      expect(screeningService.getScreeningsByTheaterId).toHaveBeenCalledWith(
        't-1'
      );
      expect(res.json).toHaveBeenCalledWith(mockScreenings);
    });
  });

  describe('getScreeningsByHallId', () => {
    it('should return screenings for a hall', async () => {
      (screeningService.getScreeningsByHallId as jest.Mock).mockResolvedValue(
        mockScreenings
      );

      const req = mockRequest({}, { hallId: 'h-1' }, { theaterId: 't-1' });
      const res = mockResponse();

      await screeningController.getScreeningsByHallId(req, res, mockNext);

      expect(screeningService.getScreeningsByHallId).toHaveBeenCalledWith(
        'h-1',
        't-1'
      );
      expect(res.json).toHaveBeenCalledWith(mockScreenings);
    });
  });

  describe('getScreeningsByDate', () => {
    it('should return screenings for a date', async () => {
      (screeningService.getScreeningsByDate as jest.Mock).mockResolvedValue(
        mockScreenings
      );

      const req = mockRequest({}, { date: '2025-01-01' });
      const res = mockResponse();

      await screeningController.getScreeningsByDate(req, res, mockNext);

      expect(screeningService.getScreeningsByDate).toHaveBeenCalledWith(
        new Date('2025-01-01')
      );
      expect(res.json).toHaveBeenCalledWith(mockScreenings);
    });

    it('should return 400 for invalid date', async () => {
      const req = mockRequest({}, { date: 'not-a-date' });
      const res = mockResponse();

      await screeningController.getScreeningsByDate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid date format' });
    });
  });
});
