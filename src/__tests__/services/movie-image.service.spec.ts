// src/__tests__/services/movie-image.service.spec.ts

import path from 'path';

// --- Mocks ---
const mockConfig = {
  baseUrl: 'http://example.com',
  multerMaxFileSize: 1024, // 1 KB for tests
};

// Mock env config so we can tweak values per test
jest.mock('../../config/env.js', () => ({
  config: mockConfig,
}));

// Mock fs/promises unlink
const unlinkMock = jest.fn();
jest.mock('fs/promises', () => ({
  unlink: unlinkMock,
}));

import { FileTooLargeError } from '../../errors/file-too-large-error.js';
import { MovieImageService } from '../../services/movie-image.service.js';

describe('MovieImageService', () => {
  let service: MovieImageService;

  beforeEach(() => {
    jest.clearAllMocks();
    // reset to defaults for each test
    mockConfig.baseUrl = 'http://example.com';
    mockConfig.multerMaxFileSize = 1024;
    service = new MovieImageService();
  });

  describe('saveMovieImage', () => {
    it('returns a full public URL using configured baseUrl', async () => {
      const file = {
        filename: 'poster.jpg',
        size: 500,
      } as unknown as Express.Multer.File;

      const url = await service.saveMovieImage(file);
      expect(url).toBe('http://example.com/uploads/movies/poster.jpg');
    });

    it('falls back to localhost when baseUrl is not set', async () => {
      mockConfig.baseUrl = ''; // simulate missing/empty baseUrl

      const file = {
        filename: 'poster.png',
        size: 123,
      } as unknown as Express.Multer.File;

      const url = await service.saveMovieImage(file);
      expect(url).toBe('http://localhost:3000/uploads/movies/poster.png');
    });

    it('throws if no file is provided', async () => {
      // @ts-expect-error testing runtime behavior
      await expect(service.saveMovieImage(undefined)).rejects.toThrow(
        'No file provided'
      );
    });

    it('throws FileTooLargeError when file exceeds size limit', async () => {
      mockConfig.multerMaxFileSize = 100; // 100 bytes
      const file = {
        filename: 'big.jpg',
        size: 101, // 1 byte too big
      } as unknown as Express.Multer.File;

      await expect(service.saveMovieImage(file)).rejects.toBeInstanceOf(
        FileTooLargeError
      );
    });
  });

  describe('deleteMovieImage', () => {
    it('calls fs.unlink with the resolved path from the public URL', async () => {
      const imageUrl = 'http://example.com/uploads/movies/poster.jpg';
      unlinkMock.mockResolvedValue(undefined);

      await service.deleteMovieImage(imageUrl);

      const expectedPath = path.resolve(
        process.cwd(),
        'uploads/movies/poster.jpg'
      );
      expect(unlinkMock).toHaveBeenCalledTimes(1);
      expect(unlinkMock).toHaveBeenCalledWith(expectedPath);
    });

    it('silently ignores ENOENT errors (file not found)', async () => {
      const imageUrl = 'http://example.com/uploads/movies/missing.jpg';
      const enoent = Object.assign(new Error('not found'), { code: 'ENOENT' });
      unlinkMock.mockRejectedValueOnce(enoent);

      await expect(service.deleteMovieImage(imageUrl)).resolves.toBeUndefined();
      expect(unlinkMock).toHaveBeenCalledTimes(1);
    });

    it('rethrows unexpected fs errors', async () => {
      const imageUrl = 'http://example.com/uploads/movies/poster.jpg';
      const boom = new Error('boom');
      unlinkMock.mockRejectedValueOnce(boom);

      await expect(service.deleteMovieImage(imageUrl)).rejects.toThrow('boom');
      expect(unlinkMock).toHaveBeenCalledTimes(1);
    });
  });
});
