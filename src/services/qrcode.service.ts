/**
 *
 * Provides methods to generate QR codes as:
 * - PNG Data URLs (base64 strings, usable in <img> tags)
 * - PNG Buffers (for download, email attachment, or file system storage)
 *
 * Internally uses the `qrcode` package.
 *
 */

import QRCode from 'qrcode';

export class QrCodeService {
  /**
   * Generates a QR code as a PNG Data URL (base64-encoded).
   * Suitable for direct embedding in `<img src="...">` tags.
   *
   * @param {string} data - The string to encode into the QR code (e.g., bookingId, URL, etc.).
   * @param {QRCode.QRCodeToDataURLOptions} [options] - Optional QR code generation settings
   * (size, margin, error correction, etc.).
   * @returns {Promise<string>} Resolves to a PNG Data URL containing the QR code image.
   * @throws {Error} If QR code generation fails.
   */
  async generateDataUrl(
    data: string,
    options?: QRCode.QRCodeToDataURLOptions
  ): Promise<string> {
    try {
      const defaultOptions: QRCode.QRCodeToDataURLOptions = {
        errorCorrectionLevel: 'M',
        width: 200,
        margin: 2,
        ...options,
      };
      return await QRCode.toDataURL(data, defaultOptions);
    } catch {
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generates a QR code as a PNG Buffer.
   * Suitable for file downloads, attachments, or saving to disk.
   *
   * @param {string} data - The string to encode into the QR code.
   * @param {QRCode.QRCodeToBufferOptions} [options] - Optional QR code generation settings.
   * @returns {Promise<Buffer>} Resolves to a PNG buffer containing the QR code image.
   * @throws {Error} If QR code generation fails.
   */
  async generatePngBuffer(
    data: string,
    options?: QRCode.QRCodeToBufferOptions
  ): Promise<Buffer> {
    try {
      const defaultOptions: QRCode.QRCodeToBufferOptions = {
        errorCorrectionLevel: 'M',
        width: 200,
        margin: 2,
        ...options,
      };
      return await QRCode.toBuffer(data, defaultOptions);
    } catch {
      throw new Error('Failed to generate QR code');
    }
  }
}

export const qrCodeService = new QrCodeService();
