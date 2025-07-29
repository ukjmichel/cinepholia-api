import { generateTicket } from '../../controllers/generate-ticket.controller.js'; // Adjust the path!
import { bookingService } from '../../services/booking.service.js';
import QRCode from 'qrcode';

// Mock dependencies
jest.mock('../../services/booking.service.js');
jest.mock('qrcode');

describe('generateTicket', () => {
  const mockReq: any = {
    params: { bookingId: 'test-booking-id' },
  };
  const mockRes: any = {
    setHeader: jest.fn(),
    send: jest.fn(),
  };
  const mockNext = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render ticket HTML with QR code and booking/user details', async () => {
    // Mock bookingService.getBookingById to return fake booking
    (bookingService.getBookingById as jest.Mock).mockResolvedValue({
      bookingId: 'test-booking-id',
      user: { firstName: 'Jean', lastName: 'Dupont' },
    });
    // Mock QRCode.toDataURL
    (QRCode.toDataURL as jest.Mock).mockResolvedValue(
      'data:image/png;base64,fakeqrcode'
    );

    await generateTicket(mockReq, mockRes, mockNext);

    // Set correct content type
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/html; charset=utf-8'
    );
    // Send HTML containing ticket details and QR code img
    const htmlSent = mockRes.send.mock.calls[0][0];
    expect(htmlSent).toContain('Votre Ticket');
    expect(htmlSent).toContain('test-booking-id');
    expect(htmlSent).toContain('Jean');
    expect(htmlSent).toContain('Dupont');
    expect(htmlSent).toContain('src="data:image/png;base64,fakeqrcode"');
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should call next(err) on error', async () => {
    // Simulate bookingService.getBookingById throwing error
    (bookingService.getBookingById as jest.Mock).mockRejectedValue(
      new Error('DB Error')
    );

    await generateTicket(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.send).not.toHaveBeenCalled();
  });

  it('should fallback to N/A if user fields missing', async () => {
    (bookingService.getBookingById as jest.Mock).mockResolvedValue({
      bookingId: 'test-booking-id',
      user: null,
    });
    (QRCode.toDataURL as jest.Mock).mockResolvedValue(
      'data:image/png;base64,fakeqrcode'
    );

    await generateTicket(mockReq, mockRes, mockNext);

    const htmlSent = mockRes.send.mock.calls[0][0];
    expect(htmlSent).toContain('Nom:</strong> N/A');
    expect(htmlSent).toContain('Prénom:</strong> N/A');
  });
});
