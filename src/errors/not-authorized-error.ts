export class NotAuthorizedError extends Error {
  status: number;
  cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'NotAuthorizedError';
    this.status = 403; // 403 Forbidden (common for "not authorized")

    if (cause) {
      this.cause = cause;
    }
    Object.setPrototypeOf(this, NotAuthorizedError.prototype);
  }
}
