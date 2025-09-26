export class FileTooLargeError extends Error {
  status: number;
  cause?: Error;

  constructor(
    message: string = 'File size exceeds the allowed limit.',
    cause?: Error
  ) {
    super(message);
    this.name = 'FileTooLargeError';
    this.status = 413; // HTTP 413 Payload Too Large

    if (cause) {
      this.cause = cause;
    }

    Object.setPrototypeOf(this, FileTooLargeError.prototype);
  }
}
