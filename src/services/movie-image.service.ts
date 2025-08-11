/**
 *
 * This service manages:
 * - Storing uploaded movie images using Multer.
 * - Validating file size against the configured maximum size.
 * - Generating publicly accessible URLs for stored images.
 * - Deleting stored movie images by public URL.
 *
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { config } from '../config/env.js';
import { FileTooLargeError } from '../errors/file-too-large-error.js';

export class MovieImageService {
  /**
   * Saves an uploaded movie image and returns the full public URL to access it.
   *
   * @param {Express.Multer.File} file - The uploaded file from Multer.
   * @returns {Promise<string>} The full public URL for the saved image.
   * @throws {FileTooLargeError} If the file size exceeds the configured limit.
   * @throws {Error} If no file is provided.
   */
  async saveMovieImage(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new Error('No file provided');
    }
    if (file.size > config.multerMaxFileSize) {
      throw new FileTooLargeError();
    }

    const baseUrl = config.baseUrl || 'http://localhost:3000';
    return `${baseUrl}/uploads/movies/${file.filename}`;
  }

  /**
   * Deletes a movie image file from the server, given its public URL.
   * Silently ignores deletion if the file does not exist.
   *
   * @param {string} imageUrl - The full public URL of the image (as returned by {@link saveMovieImage}).
   * @returns {Promise<void>}
   * @throws {Error} If an unexpected file system error occurs during deletion.
   */
  async deleteMovieImage(imageUrl: string): Promise<void> {
    try {
      const parsedUrl = new URL(imageUrl);
      const imagePath = parsedUrl.pathname;
      const relativeFilePath = imagePath.startsWith('/')
        ? imagePath.slice(1)
        : imagePath;

      const absoluteFilePath = path.resolve(process.cwd(), relativeFilePath);
      await fs.unlink(absoluteFilePath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return; // File not found — ignore
      }
      console.error('Error deleting image file:', error);
      throw error;
    }
  }
}

export const movieImageService = new MovieImageService();
