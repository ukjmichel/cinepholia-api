import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import multer from 'multer';
import { FileTooLargeError } from '../errors/file-too-large-error.js';
import { ValidationError as SequelizeValidationError } from 'sequelize';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err);

  // Multer file size
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      error: 'FileTooLarge',
      message: 'File too large. Max 2MB allowed.',
      status: 413,
    });
    return;
  }

  // Custom file size
  if (err instanceof FileTooLargeError) {
    res.status(413).json({
      error: err.name,
      message: err.message,
      status: 413,
    });
    return;
  }

  // Sequelize validation errors (invalid input)
  if (err instanceof SequelizeValidationError) {
    res.status(400).json({
      error: 'ValidationError',
      message: err.message,
      details: err.errors,
      status: 400,
    });
    return;
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
