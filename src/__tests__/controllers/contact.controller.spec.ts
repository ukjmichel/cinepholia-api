import { handleSendTheaterContactMessage } from '../../controllers/contact.controller.js';
import { emailService } from '../../services/email.service.js';
import { BadRequestError } from '../../errors/bad-request-error.js';

jest.mock('../../services/email.service.js');

describe('handleSendTheaterContactMessage', () => {
  const makeRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const makeNext = () => jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 if email is sent successfully', async () => {
    const req: any = {
      body: {
        theaterId: 'CINEMA01',
        email: 'user@example.com',
        message: 'Hello!',
      },
    };
    const res = makeRes();
    const next = makeNext();

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
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next with BadRequestError if any required field is missing', async () => {
    const req: any = {
      body: { email: 'user@example.com', message: 'Missing theaterId' },
    };
    const res = makeRes();
    const next = makeNext();

    await handleSendTheaterContactMessage(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(BadRequestError));
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(emailService.sendTheaterContactMessage).not.toHaveBeenCalled();
  });

  it('calls next with BadRequestError if email sending fails', async () => {
    const req: any = {
      body: {
        theaterId: 'CINEMA02',
        email: 'user@example.com',
        message: 'A problem occurred',
      },
    };
    const res = makeRes();
    const next = makeNext();

    (emailService.sendTheaterContactMessage as jest.Mock).mockRejectedValueOnce(
      new Error('Email error')
    );

    await handleSendTheaterContactMessage(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'BadRequestError',
        message: 'Failed to send email',
        cause: expect.any(Error),
      })
    );
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});
