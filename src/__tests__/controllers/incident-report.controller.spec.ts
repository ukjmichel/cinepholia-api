/**
 * @module tests/controllers/incident-report.controller.spec
 *
 * @description
 * Unit tests for Incident Report Express controllers.
 * - Pure controller tests: the IncidentReportService methods are spied & mocked.
 * - Validates UUID/id/status parsing, XSS sanitization, and response codes.
 * - Asserts the service is called with the right arguments.
 */

import * as controller from '../../controllers/incident-report.controller.js';
import { incidentReportService } from '../../services/incident-report.service.js';
import type { IncidentReport } from '../../models/incident-report.schema.js';
import { NotFoundError } from '../../errors/not-found-error.js';

/* -------------------------------------------------------------------------- */
/*                       Minimal Express req/res/next mocks                   */
/* -------------------------------------------------------------------------- */

const mockRequest = (body: any = {}, params: any = {}, query: any = {}) =>
  ({ body, params, query }) as any;

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

/* -------------------------------------------------------------------------- */
/*                                   Fixtures                                 */
/* -------------------------------------------------------------------------- */

const SAMPLE_INCIDENT: IncidentReport = {
  incidentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  theaterId: 'UGC_Lyon',
  hallId: 'H1',
  description: 'Projector flicker',
  status: 'open',
  createdBy: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

/* -------------------------------------------------------------------------- */
/*                                  GET all                                   */
/* -------------------------------------------------------------------------- */

describe('getAllIncidents', () => {
  it('returns 200 with all incidents', async () => {
    const res = mockResponse();
    const req = mockRequest();

    jest
      .spyOn(incidentReportService, 'getAllIncidents')
      .mockResolvedValue([SAMPLE_INCIDENT]);

    await controller.getAllIncidents(req, res, mockNext);

    expect(incidentReportService.getAllIncidents).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'All incidents',
      data: [SAMPLE_INCIDENT],
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('forwards errors to next', async () => {
    const res = mockResponse();
    const req = mockRequest();
    const err = new Error('boom');

    jest.spyOn(incidentReportService, 'getAllIncidents').mockRejectedValue(err);

    await controller.getAllIncidents(req, res, mockNext);
    expect(mockNext).toHaveBeenCalledWith(err);
  });
});

/* -------------------------------------------------------------------------- */
/*                               GET by incidentId                            */
/* -------------------------------------------------------------------------- */

describe('getIncident', () => {
  it('400 for invalid incidentId', async () => {
    const res = mockResponse();
    const req = mockRequest({}, { incidentId: 'not-a-uuid' });

    await controller.getIncident(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid incidentId (UUID)',
      data: null,
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('200 with incident for valid id', async () => {
    const res = mockResponse();
    const req = mockRequest({}, { incidentId: SAMPLE_INCIDENT.incidentId });

    jest
      .spyOn(incidentReportService, 'getIncident')
      .mockResolvedValue(SAMPLE_INCIDENT);

    await controller.getIncident(req, res, mockNext);

    expect(incidentReportService.getIncident).toHaveBeenCalledWith(
      SAMPLE_INCIDENT.incidentId
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Incident found',
      data: SAMPLE_INCIDENT,
    });
  });

  it('forwards NotFoundError', async () => {
    const res = mockResponse();
    const req = mockRequest({}, { incidentId: SAMPLE_INCIDENT.incidentId });

    jest
      .spyOn(incidentReportService, 'getIncident')
      .mockRejectedValue(new NotFoundError('nope'));

    await controller.getIncident(req, res, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
  });
});

/* -------------------------------------------------------------------------- */
/*                                GET by status                               */
/* -------------------------------------------------------------------------- */

describe('getIncidentsByStatus', () => {
  it('400 for invalid status', async () => {
    const res = mockResponse();
    const req = mockRequest({}, { status: 'bad' });

    await controller.getIncidentsByStatus(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid status',
      data: null,
    });
  });

  it('200 with incidents for valid status', async () => {
    const res = mockResponse();
    const req = mockRequest({}, { status: 'open' });

    jest
      .spyOn(incidentReportService, 'getIncidentsByStatus')
      .mockResolvedValue([SAMPLE_INCIDENT]);

    await controller.getIncidentsByStatus(req, res, mockNext);

    expect(incidentReportService.getIncidentsByStatus).toHaveBeenCalledWith(
      'open'
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

/* -------------------------------------------------------------------------- */
/*                         GET by theater / hall (location)                   */
/* -------------------------------------------------------------------------- */

describe('getIncidentsByLocation', () => {
  it('400 for invalid theaterId', async () => {
    const res = mockResponse();
    const req = mockRequest({}, { theaterId: 'A' }); // too short

    await controller.getIncidentsByLocation(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid theaterId',
      data: null,
    });
  });

  it('400 for invalid hallId', async () => {
    const res = mockResponse();
    // invalid character "!" makes it fail the idRegex, and it's truthy
    const req = mockRequest({}, { theaterId: 'Valid_Theater', hallId: '!' });

    await controller.getIncidentsByLocation(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid hallId',
      data: null,
    });
  });
  it('200 with theater-only', async () => {
    const res = mockResponse();
    const req = mockRequest({}, { theaterId: 'Valid_Theater' });

    jest
      .spyOn(incidentReportService, 'getIncidentsByLocation')
      .mockResolvedValue([SAMPLE_INCIDENT]);

    await controller.getIncidentsByLocation(req, res, mockNext);

    expect(incidentReportService.getIncidentsByLocation).toHaveBeenCalledWith(
      'Valid_Theater',
      undefined
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('200 with theater + hall', async () => {
    const res = mockResponse();
    const req = mockRequest({}, { theaterId: 'Valid_Theater', hallId: 'H1' });

    jest
      .spyOn(incidentReportService, 'getIncidentsByLocation')
      .mockResolvedValue([SAMPLE_INCIDENT]);

    await controller.getIncidentsByLocation(req, res, mockNext);

    expect(incidentReportService.getIncidentsByLocation).toHaveBeenCalledWith(
      'Valid_Theater',
      'H1'
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

/* -------------------------------------------------------------------------- */
/*                                GET by user                                 */
/* -------------------------------------------------------------------------- */

describe('getIncidentsByUser', () => {
  it('400 for invalid createdBy', async () => {
    const res = mockResponse();
    const req = mockRequest({}, { createdBy: 'nope' });

    await controller.getIncidentsByUser(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid createdBy UUID',
      data: null,
    });
  });

  it('200 for valid createdBy', async () => {
    const res = mockResponse();
    const req = mockRequest({}, { createdBy: SAMPLE_INCIDENT.createdBy });

    jest
      .spyOn(incidentReportService, 'getIncidentsByUser')
      .mockResolvedValue([SAMPLE_INCIDENT]);

    await controller.getIncidentsByUser(req, res, mockNext);

    expect(incidentReportService.getIncidentsByUser).toHaveBeenCalledWith(
      SAMPLE_INCIDENT.createdBy
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

/* -------------------------------------------------------------------------- */
/*                            GET by (business) incidentId                    */
/* -------------------------------------------------------------------------- */

describe('getIncidentsByIncidentId', () => {
  it('400 for invalid incidentId', async () => {
    const res = mockResponse();
    const req = mockRequest({}, { incidentId: 'bad' });

    await controller.getIncidentsByIncidentId(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid incidentId',
      data: null,
    });
  });

  it('200 for valid incidentId', async () => {
    const res = mockResponse();
    const req = mockRequest({}, { incidentId: SAMPLE_INCIDENT.incidentId });

    jest
      .spyOn(incidentReportService, 'getIncidentsByIncidentId')
      .mockResolvedValue([SAMPLE_INCIDENT]);

    await controller.getIncidentsByIncidentId(req, res, mockNext);

    expect(incidentReportService.getIncidentsByIncidentId).toHaveBeenCalledWith(
      SAMPLE_INCIDENT.incidentId
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

/* -------------------------------------------------------------------------- */
/*                                   CREATE                                   */
/* -------------------------------------------------------------------------- */

describe('createIncident', () => {
  it('400 when optional incidentId is invalid', async () => {
    const res = mockResponse();
    const req = mockRequest({
      incidentId: 'not-a-uuid',
      theaterId: 'Valid_Theater',
      hallId: 'H1',
      description: 'x',
      createdBy: SAMPLE_INCIDENT.createdBy,
      status: 'open',
    });

    await controller.createIncident(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid incidentId (UUID)',
      data: null,
    });
  });

  it('400 when required fields invalid', async () => {
    const res = mockResponse();
    const req = mockRequest({
      theaterId: 'A', // invalid
      hallId: 'H1',
      description: 'x',
      createdBy: SAMPLE_INCIDENT.createdBy,
    });

    await controller.createIncident(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('201 on valid payload and sanitization applied', async () => {
    const res = mockResponse();
    const dirty = `<img src=x onerror=alert(1)> Hey <b>there</b>`;
    const req = mockRequest({
      theaterId: 'Valid_Theater',
      hallId: 'H1',
      description: dirty,
      createdBy: SAMPLE_INCIDENT.createdBy,
      status: 'open',
    });

    // Return created doc
    jest
      .spyOn(incidentReportService, 'createIncident')
      .mockImplementation(async (payload: any) => {
        // Expect sanitized description: no angle brackets remain
        expect(typeof payload.description).toBe('string');
        expect(payload.description).not.toMatch(/[<>]/);
        return { ...SAMPLE_INCIDENT, ...payload } as IncidentReport;
      });

    await controller.createIncident(req, res, mockNext);

    expect(incidentReportService.createIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        theaterId: 'Valid_Theater',
        hallId: 'H1',
        createdBy: SAMPLE_INCIDENT.createdBy,
        status: 'open',
        // sanitized description already asserted inside mock
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Incident created',
      data: expect.objectContaining({
        theaterId: 'Valid_Theater',
        hallId: 'H1',
      }),
    });
  });
});

/* -------------------------------------------------------------------------- */
/*                                    UPDATE                                  */
/* -------------------------------------------------------------------------- */

describe('updateIncident', () => {
  it('400 for invalid incidentId param', async () => {
    const res = mockResponse();
    const req = mockRequest({ status: 'resolved' }, { incidentId: 'bad' });

    await controller.updateIncident(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid incidentId (UUID)',
      data: null,
    });
  });

  it('400 for invalid status value', async () => {
    const res = mockResponse();
    const req = mockRequest(
      { status: 'nope' },
      { incidentId: SAMPLE_INCIDENT.incidentId }
    );

    await controller.updateIncident(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid status value',
      data: null,
    });
  });

  it('removes incidentId from payload (immutable) and sanitizes description', async () => {
    const res = mockResponse();
    const dirty = `<script>alert(1)</script> clean`;
    const req = mockRequest(
      {
        incidentId: 'should-be-ignored',
        description: dirty,
        status: 'acknowledged',
      },
      { incidentId: SAMPLE_INCIDENT.incidentId }
    );

    jest
      .spyOn(incidentReportService, 'updateIncident')
      .mockImplementation(async (_id, payload: any) => {
        expect(_id).toBe(SAMPLE_INCIDENT.incidentId);
        // 'incidentId' must be removed from payload
        expect(payload.incidentId).toBeUndefined();
        // sanitized
        expect(typeof payload.description).toBe('string');
        expect(payload.description).not.toMatch(/[<>]/);
        return { ...SAMPLE_INCIDENT, ...payload } as IncidentReport;
      });

    await controller.updateIncident(req, res, mockNext);

    expect(incidentReportService.updateIncident).toHaveBeenCalledWith(
      SAMPLE_INCIDENT.incidentId,
      expect.any(Object)
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

/* -------------------------------------------------------------------------- */
/*                                    DELETE                                  */
/* -------------------------------------------------------------------------- */

describe('deleteIncident', () => {
  it('400 for invalid incidentId', async () => {
    const res = mockResponse();
    const req = mockRequest({}, { incidentId: 'nope' });

    await controller.deleteIncident(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid incidentId (UUID)',
      data: null,
    });
  });

  it('200 for valid id', async () => {
    const res = mockResponse();
    const req = mockRequest({}, { incidentId: SAMPLE_INCIDENT.incidentId });

    jest.spyOn(incidentReportService, 'deleteIncident').mockResolvedValue();

    await controller.deleteIncident(req, res, mockNext);

    expect(incidentReportService.deleteIncident).toHaveBeenCalledWith(
      SAMPLE_INCIDENT.incidentId
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Incident deleted',
      data: null,
    });
  });
});

/* -------------------------------------------------------------------------- */
/*                             STATUS TRANSITIONS                              */
/* -------------------------------------------------------------------------- */

describe('status transition handlers', () => {
  const validId = SAMPLE_INCIDENT.incidentId;

  it('acknowledgeIncident → 400 for invalid UUID', async () => {
    const res = mockResponse();
    const req = mockRequest({}, { incidentId: 'bad' });

    await controller.acknowledgeIncident(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('acknowledgeIncident → calls service with acknowledged', async () => {
    const res = mockResponse();
    const req = mockRequest({}, { incidentId: validId });

    jest
      .spyOn(incidentReportService, 'updateIncident')
      .mockResolvedValue({ ...SAMPLE_INCIDENT, status: 'acknowledged' });

    await controller.acknowledgeIncident(req, res, mockNext);
    expect(incidentReportService.updateIncident).toHaveBeenCalledWith(validId, {
      status: 'acknowledged',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('startProgress → calls service with in_progress', async () => {
    const res = mockResponse();
    const req = mockRequest({}, { incidentId: validId });

    jest
      .spyOn(incidentReportService, 'updateIncident')
      .mockResolvedValue({ ...SAMPLE_INCIDENT, status: 'in_progress' });

    await controller.startProgress(req, res, mockNext);
    expect(incidentReportService.updateIncident).toHaveBeenCalledWith(validId, {
      status: 'in_progress',
    });
  });

  it('resolveIncident → calls service with resolved', async () => {
    const res = mockResponse();
    const req = mockRequest({}, { incidentId: validId });

    jest
      .spyOn(incidentReportService, 'updateIncident')
      .mockResolvedValue({ ...SAMPLE_INCIDENT, status: 'resolved' });

    await controller.resolveIncident(req, res, mockNext);
    expect(incidentReportService.updateIncident).toHaveBeenCalledWith(validId, {
      status: 'resolved',
    });
  });

  it('closeIncident → calls service with closed', async () => {
    const res = mockResponse();
    const req = mockRequest({}, { incidentId: validId });

    jest
      .spyOn(incidentReportService, 'updateIncident')
      .mockResolvedValue({ ...SAMPLE_INCIDENT, status: 'closed' });

    await controller.closeIncident(req, res, mockNext);
    expect(incidentReportService.updateIncident).toHaveBeenCalledWith(validId, {
      status: 'closed',
    });
  });
});

/* -------------------------------------------------------------------------- */
/*                                   SEARCH                                   */
/* -------------------------------------------------------------------------- */

describe('searchIncidents', () => {
  it('400 for invalid status / uuids / ids', async () => {
    const res = mockResponse();
    const req = mockRequest(
      {},
      {},
      {
        status: 'nope',
        createdBy: 'bad',
        incidentId: 'bad',
        theaterId: 'A',
        hallId: '',
      }
    );

    await controller.searchIncidents(req, res, mockNext);
    // The first invalidity triggers an early 400; we only assert 400 was returned
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 for invalid dates', async () => {
    const res = mockResponse();
    const req = mockRequest(
      {},
      {},
      {
        createdAtFrom: 'not-a-date',
      }
    );

    await controller.searchIncidents(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Invalid date for createdAtFrom',
      data: null,
    });
  });

  it('200 and passes filters to service', async () => {
    const res = mockResponse();
    const req = mockRequest(
      {},
      {},
      {
        q: 'noise',
        status: 'in_progress',
        theaterId: 'UGC',
        hallId: 'H1',
        createdBy: '33333333-3333-4333-8333-333333333333',
        incidentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10',
        createdAtFrom: '2025-01-01T00:00:00Z',
        createdAtTo: '2025-01-31T23:59:59Z',
        updatedAtFrom: '2025-02-01T00:00:00Z',
        updatedAtTo: '2025-02-28T23:59:59Z',
      }
    );

    jest.spyOn(incidentReportService, 'searchIncidents').mockResolvedValue([]);

    await controller.searchIncidents(req, res, mockNext);

    expect(incidentReportService.searchIncidents).toHaveBeenCalledWith(
      'noise',
      expect.objectContaining({
        status: 'in_progress',
        theaterId: 'UGC',
        hallId: 'H1',
        createdBy: '33333333-3333-4333-8333-333333333333',
        incidentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10',
        createdAtFrom: new Date('2025-01-01T00:00:00Z'),
        createdAtTo: new Date('2025-01-31T23:59:59Z'),
        updatedAtFrom: new Date('2025-02-01T00:00:00Z'),
        updatedAtTo: new Date('2025-02-28T23:59:59Z'),
      })
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Search results',
      data: [],
    });
  });
});
