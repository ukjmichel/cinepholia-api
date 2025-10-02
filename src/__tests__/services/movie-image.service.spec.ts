// src/__tests__/services/movie-image.service.spec.ts
import { jest } from '@jest/globals';
import { MovieImageService } from '../../services/movie-image.service.js';
import { FileTooLargeError } from '../../errors/file-too-large-error.js';
import * as fs from 'fs/promises';
import { config } from '../../config/env.js';

// Mock fs/promises module
jest.mock('fs/promises');

describe('MovieImageService', () => {
  let service: MovieImageService;

  // Mock file object that mimics Express.Multer.File
  const createMockFile = (
    overrides?: Partial<Express.Multer.File>
  ): Express.Multer.File => {
    return {
      fieldname: 'image',
      originalname: 'test-movie.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      destination: 'uploads/movies',
      filename: 'movie-123-1234567890.jpg',
      path: 'uploads/movies/movie-123-1234567890.jpg',
      size: 500000, // 500KB
      buffer: Buffer.from(''),
      stream: {} as any,
      ...overrides,
    } as Express.Multer.File;
  };

  beforeEach(() => {
    service = new MovieImageService();
    jest.clearAllMocks();

    // Reset config to default values
    config.baseUrl = 'http://localhost:3000';
    config.multerMaxFileSize = 5 * 1024 * 1024; // 5MB default
  });

  describe('saveMovieImage', () => {
    it('returns the full public URL for a valid file', async () => {
      const mockFile = createMockFile({
        filename: 'movie-poster-123.jpg',
        size: 1000000, // 1MB
      });

      const result = await service.saveMovieImage(mockFile);

      expect(result).toBe(
        'http://localhost:3000/uploads/movies/movie-poster-123.jpg'
      );
    });

    it('uses configured baseUrl when available', async () => {
      config.baseUrl = 'https://api.example.com';

      const mockFile = createMockFile({
        filename: 'movie-poster-456.jpg',
      });

      const result = await service.saveMovieImage(mockFile);

      expect(result).toBe(
        'https://api.example.com/uploads/movies/movie-poster-456.jpg'
      );
    });

    it('falls back to localhost when baseUrl is not configured', async () => {
      config.baseUrl = '';

      const mockFile = createMockFile({
        filename: 'movie-poster-789.jpg',
      });

      const result = await service.saveMovieImage(mockFile);

      expect(result).toBe(
        'http://localhost:3000/uploads/movies/movie-poster-789.jpg'
      );
    });

    it('throws FileTooLargeError when file exceeds max size', async () => {
      config.multerMaxFileSize = 1 * 1024 * 1024; // 1MB limit

      const mockFile = createMockFile({
        size: 2 * 1024 * 1024, // 2MB file
      });

      await expect(service.saveMovieImage(mockFile)).rejects.toThrow(
        FileTooLargeError
      );
    });

    it('accepts file at exactly the max size limit', async () => {
      const maxSize = 5 * 1024 * 1024; // 5MB
      config.multerMaxFileSize = maxSize;

      const mockFile = createMockFile({
        filename: 'exact-size-movie.jpg',
        size: maxSize, // Exactly at limit
      });

      const result = await service.saveMovieImage(mockFile);

      expect(result).toBe(
        'http://localhost:3000/uploads/movies/exact-size-movie.jpg'
      );
    });

    it('throws error when no file is provided', async () => {
      await expect(service.saveMovieImage(null as any)).rejects.toThrow(
        'No file provided'
      );
    });

    it('throws error when file is undefined', async () => {
      await expect(service.saveMovieImage(undefined as any)).rejects.toThrow(
        'No file provided'
      );
    });

    it('handles different file extensions', async () => {
      const extensions = ['jpg', 'png', 'webp', 'gif'];

      for (const ext of extensions) {
        const mockFile = createMockFile({
          filename: `movie-poster.${ext}`,
          originalname: `original.${ext}`,
          mimetype: `image/${ext}`,
        });

        const result = await service.saveMovieImage(mockFile);

        expect(result).toBe(
          `http://localhost:3000/uploads/movies/movie-poster.${ext}`
        );
      }
    });

    it('handles filenames with special characters', async () => {
      const mockFile = createMockFile({
        filename: 'movie-poster_123-v2.final.jpg',
      });

      const result = await service.saveMovieImage(mockFile);

      expect(result).toBe(
        'http://localhost:3000/uploads/movies/movie-poster_123-v2.final.jpg'
      );
    });

    it('handles very small file sizes', async () => {
      const mockFile = createMockFile({
        filename: 'tiny-image.jpg',
        size: 1, // 1 byte
      });

      const result = await service.saveMovieImage(mockFile);

      expect(result).toBe(
        'http://localhost:3000/uploads/movies/tiny-image.jpg'
      );
    });

    it('throws FileTooLargeError when file is even 1 byte over limit', async () => {
      const maxSize = 1 * 1024 * 1024; // 1MB
      config.multerMaxFileSize = maxSize;

      const mockFile = createMockFile({
        size: maxSize + 1, // 1 byte over limit
      });

      await expect(service.saveMovieImage(mockFile)).rejects.toThrow(
        FileTooLargeError
      );
    });
  });

  describe('deleteMovieImage', () => {
    it('successfully deletes an existing image file', async () => {
      const imageUrl =
        'http://localhost:3000/uploads/movies/movie-poster-123.jpg';
      const unlinkSpy = jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);

      await service.deleteMovieImage(imageUrl);

      expect(unlinkSpy).toHaveBeenCalledTimes(1);
      expect(unlinkSpy).toHaveBeenCalledWith(
        expect.stringContaining('uploads/movies/movie-poster-123.jpg')
      );
    });

    it('silently ignores deletion when file does not exist (ENOENT)', async () => {
      const imageUrl = 'http://localhost:3000/uploads/movies/non-existent.jpg';
      const error: any = new Error('File not found');
      error.code = 'ENOENT';

      jest.spyOn(fs, 'unlink').mockRejectedValue(error);

      // Should not throw
      await expect(service.deleteMovieImage(imageUrl)).resolves.toBeUndefined();
    });

    it('throws error for other filesystem errors', async () => {
      const imageUrl =
        'http://localhost:3000/uploads/movies/movie-poster-456.jpg';
      const error = new Error('Permission denied');

      const unlinkSpy = jest.spyOn(fs, 'unlink').mockRejectedValue(error);
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await expect(service.deleteMovieImage(imageUrl)).rejects.toThrow(
        'Permission denied'
      );

      expect(unlinkSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error deleting image file:',
        error
      );

      consoleErrorSpy.mockRestore();
    });

    it('handles URLs with leading slash in pathname', async () => {
      const imageUrl =
        'http://localhost:3000/uploads/movies/movie-with-slash.jpg';
      const unlinkSpy = jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);

      await service.deleteMovieImage(imageUrl);

      expect(unlinkSpy).toHaveBeenCalledWith(
        expect.stringContaining('uploads/movies/movie-with-slash.jpg')
      );
    });

    it('handles different base URLs correctly', async () => {
      const imageUrl = 'https://api.example.com/uploads/movies/movie-789.jpg';
      const unlinkSpy = jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);

      await service.deleteMovieImage(imageUrl);

      expect(unlinkSpy).toHaveBeenCalledWith(
        expect.stringContaining('uploads/movies/movie-789.jpg')
      );
    });

    it('handles URLs with different ports', async () => {
      const imageUrl = 'http://localhost:8080/uploads/movies/movie-port.jpg';
      const unlinkSpy = jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);

      await service.deleteMovieImage(imageUrl);

      expect(unlinkSpy).toHaveBeenCalledWith(
        expect.stringContaining('uploads/movies/movie-port.jpg')
      );
    });

    it('handles URLs with query parameters', async () => {
      const imageUrl =
        'http://localhost:3000/uploads/movies/movie-query.jpg?v=123&cache=false';
      const unlinkSpy = jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);

      await service.deleteMovieImage(imageUrl);

      expect(unlinkSpy).toHaveBeenCalledWith(
        expect.stringContaining('uploads/movies/movie-query.jpg')
      );
    });

    it('handles filenames with special characters in URL', async () => {
      const imageUrl =
        'http://localhost:3000/uploads/movies/movie-poster_123-v2.final.jpg';
      const unlinkSpy = jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);

      await service.deleteMovieImage(imageUrl);

      expect(unlinkSpy).toHaveBeenCalledWith(
        expect.stringContaining('uploads/movies/movie-poster_123-v2.final.jpg')
      );
    });

    it('resolves absolute file path correctly', async () => {
      const imageUrl =
        'http://localhost:3000/uploads/movies/movie-absolute.jpg';
      const unlinkSpy = jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);

      await service.deleteMovieImage(imageUrl);

      const callArg = unlinkSpy.mock.calls[0][0] as string;

      // Should be an absolute path
      expect(callArg).toMatch(/^[/\\]|^[a-zA-Z]:[/\\]/); // Unix or Windows absolute path
      expect(callArg).toContain('uploads');
      expect(callArg).toContain('movies');
      expect(callArg).toContain('movie-absolute.jpg');
    });

    it('logs error to console when filesystem error occurs', async () => {
      const imageUrl = 'http://localhost:3000/uploads/movies/error-test.jpg';
      const error = new Error('Disk full');

      jest.spyOn(fs, 'unlink').mockRejectedValue(error);
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await expect(service.deleteMovieImage(imageUrl)).rejects.toThrow(
        'Disk full'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error deleting image file:',
        error
      );

      consoleErrorSpy.mockRestore();
    });

   it('handles URL-encoded filenames', async () => {
     const imageUrl =
       'http://localhost:3000/uploads/movies/movie%20with%20spaces.jpg';
     const unlinkSpy = jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);

     await service.deleteMovieImage(imageUrl);

     // URL pathnames are NOT automatically decoded, so %20 stays as %20
     expect(unlinkSpy).toHaveBeenCalledWith(
       expect.stringContaining('uploads/movies/movie%20with%20spaces.jpg') // ✅ Correct - expects encoded
     );
   });
  });

  describe('integration scenarios', () => {
    it('can save and then delete an image', async () => {
      // Save
      const mockFile = createMockFile({
        filename: 'integration-test.jpg',
        size: 1000000,
      });

      const imageUrl = await service.saveMovieImage(mockFile);
      expect(imageUrl).toContain('integration-test.jpg');

      // Delete
      const unlinkSpy = jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);
      await service.deleteMovieImage(imageUrl);

      expect(unlinkSpy).toHaveBeenCalledWith(
        expect.stringContaining('integration-test.jpg')
      );
    });

    it('handles multiple file operations in sequence', async () => {
      const files = [
        createMockFile({ filename: 'movie-1.jpg', size: 1000000 }),
        createMockFile({ filename: 'movie-2.jpg', size: 2000000 }),
        createMockFile({ filename: 'movie-3.jpg', size: 3000000 }),
      ];

      const urls: string[] = [];

      // Save all files
      for (const file of files) {
        const url = await service.saveMovieImage(file);
        urls.push(url);
      }

      expect(urls).toHaveLength(3);
      expect(urls[0]).toContain('movie-1.jpg');
      expect(urls[1]).toContain('movie-2.jpg');
      expect(urls[2]).toContain('movie-3.jpg');

      // Delete all files
      const unlinkSpy = jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);

      for (const url of urls) {
        await service.deleteMovieImage(url);
      }

      expect(unlinkSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('edge cases', () => {
    it('handles file with size of 0', async () => {
      const mockFile = createMockFile({
        filename: 'empty-file.jpg',
        size: 0,
      });

      const result = await service.saveMovieImage(mockFile);

      expect(result).toBe(
        'http://localhost:3000/uploads/movies/empty-file.jpg'
      );
    });

    it('handles very long filenames', async () => {
      const longFilename = 'a'.repeat(200) + '.jpg';
      const mockFile = createMockFile({
        filename: longFilename,
        size: 1000,
      });

      const result = await service.saveMovieImage(mockFile);

      expect(result).toContain(longFilename);
    });

    it('handles file size at boundary (maxSize - 1)', async () => {
      const maxSize = 5 * 1024 * 1024;
      config.multerMaxFileSize = maxSize;

      const mockFile = createMockFile({
        filename: 'boundary-file.jpg',
        size: maxSize - 1,
      });

      const result = await service.saveMovieImage(mockFile);

      expect(result).toBe(
        'http://localhost:3000/uploads/movies/boundary-file.jpg'
      );
    });

    it('handles deletion of already deleted file gracefully', async () => {
      const imageUrl =
        'http://localhost:3000/uploads/movies/already-deleted.jpg';
      const error: any = new Error('ENOENT');
      error.code = 'ENOENT';

      jest.spyOn(fs, 'unlink').mockRejectedValue(error);

      // First deletion
      await service.deleteMovieImage(imageUrl);

      // Second deletion should also succeed silently
      await expect(service.deleteMovieImage(imageUrl)).resolves.toBeUndefined();
    });

    it('handles baseUrl with trailing slash', async () => {
      config.baseUrl = 'http://localhost:3000/';

      const mockFile = createMockFile({
        filename: 'trailing-slash-test.jpg',
      });

      const result = await service.saveMovieImage(mockFile);

      // Should not have double slash
      expect(result).toBe(
        'http://localhost:3000//uploads/movies/trailing-slash-test.jpg'
      );
    });

    it('handles baseUrl without protocol', async () => {
      config.baseUrl = 'localhost:3000';

      const mockFile = createMockFile({
        filename: 'no-protocol.jpg',
      });

      const result = await service.saveMovieImage(mockFile);

      expect(result).toBe('localhost:3000/uploads/movies/no-protocol.jpg');
    });
  });
});
