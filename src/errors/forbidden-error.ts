export class ForbiddenError extends Error {
  status: number;
  cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'ForbiddenError';
    this.status = 403;

    if (cause) {
      this.cause = cause;
    }

    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}
