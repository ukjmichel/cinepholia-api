/**
 * @module middleware/upload.middleware
 *
 * Configurable file upload middleware using multer.
 * Supports different file types, size limits, and validation rules.
 */

import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/* =============== TYPES =============== */

export interface UploadConfig {
  allowedMimeTypes?: string[];
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  fieldName?: string;
  destination?: string;
  useMemoryStorage?: boolean;
  generateFilename?: (originalname: string) => string;
}

export interface UploadPresets {
  images: UploadConfig;
  documents: UploadConfig;
  videos: UploadConfig;
  any: UploadConfig;
}

/* =============== DEFAULT CONFIGURATIONS =============== */

const defaultPresets: UploadPresets = {
  images: {
    allowedMimeTypes: [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 1,
    useMemoryStorage: true,
  },
  documents: {
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    useMemoryStorage: false,
    destination: './uploads/documents',
  },
  videos: {
    allowedMimeTypes: [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo', // .avi
      'video/x-ms-wmv',
    ],
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxFiles: 1,
    useMemoryStorage: false,
    destination: './uploads/videos',
  },
  any: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
    useMemoryStorage: false,
    destination: './uploads/files',
  },
};

/* =============== HELPER FUNCTIONS =============== */

/**
 * Generate a unique filename with timestamp and random string
 */
const generateUniqueFilename = (originalname: string): string => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalname);
  const basename = path.basename(originalname, extension);
  const sanitizedBasename = basename.replace(/[^a-zA-Z0-9]/g, '_');

  return `${sanitizedBasename}_${timestamp}_${randomString}${extension}`;
};

/**
 * Create multer storage configuration
 */
const createStorage = (config: UploadConfig): multer.StorageEngine => {
  if (config.useMemoryStorage) {
    return multer.memoryStorage();
  }

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, config.destination || './uploads');
    },
    filename: (req, file, cb) => {
      const filename = config.generateFilename
        ? config.generateFilename(file.originalname)
        : generateUniqueFilename(file.originalname);
      cb(null, filename);
    },
  });
};

/**
 * Create file filter function
 */
const createFileFilter = (
  config: UploadConfig
): multer.Options['fileFilter'] => {
  return (req, file, cb) => {
    // Check MIME type if specified
    if (config.allowedMimeTypes && config.allowedMimeTypes.length > 0) {
      if (!config.allowedMimeTypes.includes(file.mimetype)) {
        const error = new Error(
          `Invalid file type. Allowed types: ${config.allowedMimeTypes.join(', ')}`
        );
        (error as any).code = 'INVALID_FILE_TYPE';
        return cb(error);
      }
    }

    // Additional security check: verify file extension matches MIME type
    const extension = path.extname(file.originalname).toLowerCase();
    const mimeTypeExtensions: Record<string, string[]> = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
    };

    if (config.allowedMimeTypes) {
      const expectedExtensions = mimeTypeExtensions[file.mimetype];
      if (expectedExtensions && !expectedExtensions.includes(extension)) {
        const error = new Error(
          `File extension ${extension} does not match MIME type ${file.mimetype}`
        );
        (error as any).code = 'EXTENSION_MISMATCH';
        return cb(error);
      }
    }

    cb(null, true);
  };
};

/* =============== MAIN UPLOAD MIDDLEWARE =============== */

/**
 * Create upload middleware with custom configuration
 */
export const createUploadMiddleware = (config: UploadConfig = {}) => {
  const finalConfig = { ...defaultPresets.any, ...config };

  const storage = createStorage(finalConfig);
  const fileFilter = createFileFilter(finalConfig);

  const upload = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: finalConfig.maxFileSize,
      files: finalConfig.maxFiles,
    },
  });

  return finalConfig.maxFiles === 1
    ? upload.single(finalConfig.fieldName || 'file')
    : upload.array(finalConfig.fieldName || 'files', finalConfig.maxFiles);
};

/**
 * Preset upload middlewares for common use cases
 */
export const uploadMiddleware = {
  // Single image upload (for avatars, posters, etc.)
  singleImage: (fieldName: string = 'image') =>
    createUploadMiddleware({
      ...defaultPresets.images,
      fieldName,
      maxFiles: 1,
    }),

  // Multiple images upload
  multipleImages: (fieldName: string = 'images', maxFiles: number = 5) =>
    createUploadMiddleware({
      ...defaultPresets.images,
      fieldName,
      maxFiles,
    }),

  // Document upload
  document: (fieldName: string = 'document') =>
    createUploadMiddleware({
      ...defaultPresets.documents,
      fieldName,
      maxFiles: 1,
    }),

  // Multiple documents
  documents: (fieldName: string = 'documents', maxFiles: number = 5) =>
    createUploadMiddleware({
      ...defaultPresets.documents,
      fieldName,
      maxFiles,
    }),

  // Video upload
  video: (fieldName: string = 'video') =>
    createUploadMiddleware({
      ...defaultPresets.videos,
      fieldName,
      maxFiles: 1,
    }),

  // Any file type
  any: (fieldName: string = 'file', maxFiles: number = 1) =>
    createUploadMiddleware({
      ...defaultPresets.any,
      fieldName,
      maxFiles,
    }),
};

/* =============== ERROR HANDLING MIDDLEWARE =============== */

/**
 * Multer error handling middleware
 * Throws errors to be caught by central error handler
 */
export const handleUploadErrors = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error instanceof multer.MulterError) {
    // Let the central error handler deal with multer errors
    next(error);
    return;
  }

  // Handle custom file validation errors by throwing them
  if (
    error.code === 'INVALID_FILE_TYPE' ||
    error.code === 'EXTENSION_MISMATCH'
  ) {
    const customError = new Error(error.message);
    (customError as any).status = 400;
    (customError as any).name = 'FileValidationError';
    next(customError);
    return;
  }

  // Pass other errors to the next error handler
  next(error);
};

/* =============== UTILITY FUNCTIONS =============== */

/**
 * Validate uploaded files in route handlers
 */
export const validateUploadedFiles = (
  req: Request,
  required: boolean = true
): { isValid: boolean; error?: string } => {
  const file = req.file;
  const files = req.files as Express.Multer.File[];

  if (required && !file && (!files || files.length === 0)) {
    return {
      isValid: false,
      error: 'No files uploaded',
    };
  }

  return { isValid: true };
};

/**
 * Get file info for response
 */
export const getFileInfo = (file: Express.Multer.File) => ({
  originalName: file.originalname,
  filename: file.filename,
  mimetype: file.mimetype,
  size: file.size,
  path: file.path,
});

/**
 * Clean up uploaded files (for error scenarios)
 */
export const cleanupFiles = async (
  files: Express.Multer.File[]
): Promise<void> => {
  const fs = await import('fs/promises');

  for (const file of files) {
    if (file.path) {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.error(`Failed to delete file ${file.path}:`, error);
      }
    }
  }
};

export default uploadMiddleware;
