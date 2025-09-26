export class ConflictError extends Error {
  status: number;
  cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'ConflictError';
    this.status = 409;

    if (cause) {
      this.cause = cause;
    }

    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}
