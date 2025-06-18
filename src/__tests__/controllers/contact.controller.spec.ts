import { handleSendTheaterContactMessage } from '../../controllers/contact.controller.js';
import { emailService } from '../../services/email.service.js';
import { BadRequestError } from '../../errors/bad-request-error.js';

jest.mock('../../services/email.service.js');

describe('handleSendTheaterContactMessage', () => {
  const req: any = {};
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 if email is sent successfully', async () => {
    req.body = {
      theaterId: 'CINEMA01',
      email: 'user@example.com',
      message: 'Hello!',
    };

    (emailService.sendTheaterContactMessage as jest.Mock).mockResolvedValueOnce(
      undefined
    );

    await handleSendTheaterContactMessage(req, res, next);

    expect(emailService.sendTheaterContactMessage).toHaveBeenCalledWith(
      'CINEMA01',
      'user@example.com',
      'Hello!'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Email sent successfully',
    });
  });

  it('should call next with BadRequestError if any field is missing', async () => {
    req.body = { email: 'user@example.com', message: 'Missing theaterId' };

    await handleSendTheaterContactMessage(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
  });

  it('should call next with BadRequestError if email sending fails', async () => {
    req.body = {
      theaterId: 'CINEMA02',
      email: 'user@example.com',
      message: 'A problem occurred',
    };

    (emailService.sendTheaterContactMessage as jest.Mock).mockRejectedValueOnce(
      new Error('Email error')
    );

    await handleSendTheaterContactMessage(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Failed to send email',
        cause: expect.any(Error),
      })
    );
  });
});
