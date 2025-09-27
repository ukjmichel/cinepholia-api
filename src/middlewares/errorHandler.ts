import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ValidationError as SequelizeValidationError } from 'sequelize';
import jwt from 'jsonwebtoken';

export const errorHandler: ErrorRequestHandler = (err, req, res, next): any => {
  console.error(err);

  // Enhanced Multer error handling
  if (err instanceof multer.MulterError) {
    let message = 'Upload error occurred';
    let status = 400;

    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File too large. Max 5MB allowed.';
        status = 413;
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        status = 400;
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields';
        status = 400;
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name too long';
        status = 400;
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value too long';
        status = 400;
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts';
        status = 400;
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        status = 400;
        break;
      default:
        message = err.message || 'Upload error';
        status = 400;
    }

    res.status(status).json({
      error: 'UploadError',
      message,
      status,
    });
    return;
  }

  // File validation errors (from upload middleware)
  if (err.name === 'FileValidationError') {
    res.status(400).json({
      error: 'FileValidationError',
      message: err.message,
      status: 400,
    });
    return;
  }

  // Sequelize validation errors (invalid input, constraints, etc.)
  if (err instanceof SequelizeValidationError) {
    res.status(400).json({
      error: 'ValidationError',
      message: err.message,
      details: err.errors,
      status: 400,
    });
    return;
  }

  // JWT errors (invalid/malformed/expired token)
  if (
    err instanceof jwt.JsonWebTokenError ||
    err instanceof jwt.TokenExpiredError ||
    err instanceof jwt.NotBeforeError
  ) {
    return res.status(401).json({
      error: err.name,
      message: err.message || 'Invalid or expired token',
      status: 401,
    });
  }

  // Fallback: generic error
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: err.name || 'Error',
    message,
    status,
  });
  return;
};
