export class ValidationError extends Error {
  status: number;
  cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'ValidationError';
    this.status = 422;

    if (cause) {
      this.cause = cause;
    }

    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
