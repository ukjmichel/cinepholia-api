export class UnauthorizedError extends Error {
  status: number;
  cause?: Error;

  constructor(message: string = 'Unauthorized', cause?: Error) {
    super(message);
    this.name = 'UnauthorizedError';
    this.status = 401;

    if (cause) {
      this.cause = cause;
    }
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}
