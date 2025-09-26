export class BadRequestError extends Error {
  status: number;
  cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'BadRequestError';
    this.status = 400;

    if (cause) {
      this.cause = cause;
    }

    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}
