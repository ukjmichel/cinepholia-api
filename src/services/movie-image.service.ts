import { config } from '../config/env.js';
import { FileTooLargeError } from '../errors/file-too-large-error.js';

export class MovieImageService {
  /**
   * Saves an uploaded movie image and returns the **full public URL**.
   * Throws FileTooLargeError if file is too big.
   */
  static async saveMovieImage(file: Express.Multer.File): Promise<string> {
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
}
