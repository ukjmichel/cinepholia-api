export class NotFoundError extends Error {
  status: number;
  cause?: Error; // optional property for the original error

  constructor(message: string, cause?: Error) {
    // ES2022 supports Error options with 'cause'
    super(message);
    this.name = 'NotFoundError';
    this.status = 404;

    // Store the original error if provided
    if (cause) {
      this.cause = cause;
    }

    // Optionally: set the prototype explicitly (required for custom errors pre-ES6)
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
