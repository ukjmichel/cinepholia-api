import QRCode from 'qrcode';
import { qrCodeService } from '../../services/qrcode.service.js';

// Mock the 'qrcode' package
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
  toBuffer: jest.fn(),
}));

describe('qrCodeService', () => {
  const mockData = 'test-booking-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDataUrl', () => {
    it('should return a data URL when QR code generation succeeds', async () => {
      const fakeDataUrl = 'data:image/png;base64,FAKEQRDATA';
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(fakeDataUrl);

      const result = await qrCodeService.generateDataUrl(mockData);

      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        mockData,
        expect.objectContaining({
          errorCorrectionLevel: 'M',
          width: 200,
          margin: 2,
        })
      );
      expect(result).toBe(fakeDataUrl);
    });

    it('should throw an error if QR code generation fails', async () => {
      (QRCode.toDataURL as jest.Mock).mockRejectedValue(
        new Error('Generation failed')
      );

      await expect(qrCodeService.generateDataUrl(mockData)).rejects.toThrow(
        'Failed to generate QR code'
      );
    });
  });

  describe('generatePngBuffer', () => {
    it('should return a PNG buffer when QR code generation succeeds', async () => {
      const fakeBuffer = Buffer.from([0x00, 0x01, 0x02]);
      (QRCode.toBuffer as jest.Mock).mockResolvedValue(fakeBuffer);

      const result = await qrCodeService.generatePngBuffer(mockData);

      expect(QRCode.toBuffer).toHaveBeenCalledWith(
        mockData,
        expect.objectContaining({
          errorCorrectionLevel: 'M',
          width: 200,
          margin: 2,
        })
      );
      expect(result).toBe(fakeBuffer);
    });

    it('should throw an error if QR code generation fails', async () => {
      (QRCode.toBuffer as jest.Mock).mockRejectedValue(
        new Error('Generation failed')
      );

      await expect(qrCodeService.generatePngBuffer(mockData)).rejects.toThrow(
        'Failed to generate QR code'
      );
    });
  });
});
