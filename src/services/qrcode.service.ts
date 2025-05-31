import QRCode from 'qrcode';

export class QrCodeService {
  /**
   * Generates a QR code as a Data URL (PNG base64) for any string data.
   * @param data - The string to encode (e.g., bookingId)
   * @param options - Optional QR code options (width, margin, etc)
   * @returns Promise<string> - Data URL of the generated QR code (for <img src="...">)
   */
  static async generateDataUrl(
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
   * Generates a QR code as a PNG buffer (for download or email attachment)
   * @param data - The string to encode
   * @param options - Optional QR code options
   * @returns Promise<Buffer> - PNG buffer of the QR code
   */
  static async generatePngBuffer(
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
