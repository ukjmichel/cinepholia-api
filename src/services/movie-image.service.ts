/**
 * Service for handling movie image uploads.
 *
 * This service manages storing uploaded movie images and generating their publicly accessible URLs.
 * It ensures proper validation of file size constraints and uses a configured base URL or defaults to localhost.
 *
 * Main functionalities:
 * - Saving uploaded movie images with Multer.
 * - Validating file size against configured maximum size.
 * - Generating a public URL for accessing stored images.
 *
 * Explicitly handled errors:
 * - `FileTooLargeError`: Thrown if the file size exceeds the configured limit.
 * - `Error`: Thrown if no file is provided.
 */
import * as path from 'path';
import * as fs from 'fs/promises';
import { config } from '../config/env.js';
import { FileTooLargeError } from '../errors/file-too-large-error.js';

export class MovieImageService {
  /**
   * Saves an uploaded movie image and returns the **full public URL**.
   * Throws FileTooLargeError if file is too big.
   *
   * @param {Express.Multer.File} file - The uploaded file from Multer.
   * @returns {Promise<string>} The full public URL for the saved image.
   * @throws {FileTooLargeError} If the file size is too large.
   * @throws {Error} If no file is provided.
   */
  async saveMovieImage(file: Express.Multer.File): Promise<string> {
    if (!file) throw new Error('No file provided');
    if (file.size > config.multerMaxFileSize) {
      throw new FileTooLargeError();
    }

    // Use either an environment variable (recommended) or fallback to localhost.
    const baseUrl = config.baseUrl || 'http://localhost:3000';
    // file.filename is set by Multer (not originalname, which may not be unique!)
    // Your Multer config should use 'uploads/movies' as destination.
    return `${baseUrl}/uploads/movies/${file.filename}`;
  }

  /**
   * Deletes a movie image file from the server, given its public URL.
   * Does nothing if the file doesn't exist.
   *
   * @param {string} imageUrl - The full public URL of the image (as returned by saveMovieImage).
   * @returns {Promise<void>}
   */
  async deleteMovieImage(imageUrl: string): Promise<void> {
    try {
      // Parse the filename from the imageUrl
      // Assumes your URLs look like: `${baseUrl}/uploads/movies/<filename>`
      const parsedUrl = new URL(imageUrl);
      // The pathname is like /uploads/movies/filename.jpg
      const imagePath = parsedUrl.pathname; // "/uploads/movies/filename.jpg"
      // Remove leading slash and join with your project root
      const relativeFilePath = imagePath.startsWith('/')
        ? imagePath.slice(1)
        : imagePath;

      // Use path.resolve to get the absolute path (adjust process.cwd() as needed for your setup)
      const absoluteFilePath = path.resolve(process.cwd(), relativeFilePath);

      // Try to delete the file (fs.promises.unlink throws if not found)
      await fs.unlink(absoluteFilePath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File not found: ignore
        return;
      }
      // Log and re-throw other errors
      console.error('Error deleting image file:', error);
      throw error;
    }
  }
}

export const movieImageService = new MovieImageService();
