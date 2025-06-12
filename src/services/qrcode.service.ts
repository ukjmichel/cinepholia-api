/**
 * Service for generating QR codes in various formats.
 *
 * This service provides methods to generate QR codes as:
 * - Data URLs (PNG base64 strings, usable in <img> tags)
 * - PNG buffers (suitable for download or email attachment)
 *
 * Uses the 'qrcode' package internally. All generation options are customizable.
 *
 * Example usage:
 * ```js
 * const dataUrl = await QrCodeService.generateDataUrl('booking123');
 * const pngBuffer = await QrCodeService.generatePngBuffer('booking123');
 * ```
 *
 */

import QRCode from 'qrcode';

export class QrCodeService {
  /**
   * Generates a QR code as a PNG Data URL (base64-encoded), for direct use in <img src="..."> tags.
   *
   * @param {string} data - The string to encode into the QR code (e.g., bookingId, URL, etc.).
   * @param {QRCode.QRCodeToDataURLOptions} [options] - Optional QR code generation options (size, margin, error correction, etc.).
   * @returns {Promise<string>} Resolves to the QR code as a PNG Data URL string.
   * @throws {Error} If QR code generation fails.
   */
  async generateDataUrl(
    data: string,
    options?: QRCode.QRCodeToDataURLOptions
  ): Promise<string> {
    try {
      // Default options: 200x200 px, medium error correction
      const defaultOptions: QRCode.QRCodeToDataURLOptions = {
        errorCorrectionLevel: 'M',
        width: 200,
        margin: 2,
        ...options,
      };
      return await QRCode.toDataURL(data, defaultOptions);
    } catch (err) {
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generates a QR code as a PNG Buffer, suitable for file download, email attachment, or file system storage.
   *
   * @param {string} data - The string to encode into the QR code.
   * @param {QRCode.QRCodeToBufferOptions} [options] - Optional QR code generation options.
   * @returns {Promise<Buffer>} Resolves to a PNG buffer containing the QR code.
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
    } catch (err) {
      throw new Error('Failed to generate QR code');
    }
  }
}

export const qrCodeService = new QrCodeService();
