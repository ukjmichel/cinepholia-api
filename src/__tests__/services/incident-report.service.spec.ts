/**
 * @module tests/services/incident-report.service.spec
 *
 * @description
 * Unit tests for the minimal IncidentReportService (no business logic).
 * - Pure unit tests: Mongoose model methods are mocked; no MongoDB.
 * - Uses Jest's argument matchers (objectContaining, etc.) instead of indexing
 *   into `spy.mock.calls[0][0]` — avoids TS errors like:
 *   "Tuple type '[]' of length '0' has no element at index '0'" and
 *   "'filter' is possibly 'undefined'".
 */

import { incidentReportService } from '../../services/incident-report.service.js';
import {
  IncidentReportModel,
  type IncidentReport,
} from '../../models/incident-report.schema.js';
import { NotFoundError } from '../../errors/not-found-error.js';

/* -------------------------------------------------------------------------- */
/*                               Mock helpers                                 */
/* -------------------------------------------------------------------------- */

/** Simulate a query that supports `.lean()` returning a resolved value. */
const mockLeanReturn = <T>(value: T) =>
  ({ lean: jest.fn().mockResolvedValue(value) }) as any;

/** Simulate `.find(...).sort(...).lean()` chain. */
const mockSortLeanReturn = <T>(value: T) =>
  ({
    sort: jest
      .fn()
      .mockReturnValue({ lean: jest.fn().mockResolvedValue(value) }),
  }) as any;

describe('IncidentReportService (unit, mocked Mongoose)', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  /* ======================================================================== */
  /* getIncident                                                              */
  /* ======================================================================== */

  it('returns the incident when found', async () => {
    const sample = {
      incidentId: '11111111-1111-4111-8111-111111111111',
      theaterId: 'UGC_Lyon',
      hallId: 'H1',
      description: 'Projector issue',
      status: 'open',
      createdBy: '22222222-2222-4222-8222-222222222222',
    };

    const findOneSpy = jest
      .spyOn(IncidentReportModel, 'findOne')
      .mockReturnValue(mockLeanReturn(sample));

    const res = await incidentReportService.getIncident(sample.incidentId);

    expect(findOneSpy).toHaveBeenCalledWith({ incidentId: sample.incidentId });
    expect(res).toEqual(sample);
  });

  it('throws NotFoundError when not found', async () => {
    jest
      .spyOn(IncidentReportModel, 'findOne')
      .mockReturnValue(mockLeanReturn(null));

    await expect(
      incidentReportService.getIncident('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  /* ======================================================================== */
  /* createIncident                                                           */
  /* ======================================================================== */

  it('returns created POJO via toObject()', async () => {
    const createdPOJO: IncidentReport = {
      incidentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      theaterId: 'T1',
      hallId: 'H1',
      description: 'desc',
      status: 'open',
      createdBy: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const createSpy = jest
      .spyOn(IncidentReportModel, 'create')
      .mockResolvedValue({ toObject: () => createdPOJO } as any);

    const res = await incidentReportService.createIncident({
      incidentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      theaterId: 'T1',
      hallId: 'H1',
      description: 'desc',
      status: 'open',
      createdBy: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    } as Omit<IncidentReport, 'createdAt' | 'updatedAt'>);

    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(res).toEqual(createdPOJO);
  });

  /* ======================================================================== */
  /* updateIncident                                                           */
  /* ======================================================================== */

  it('returns the updated document', async () => {
    const incidentId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
    // Use Partial<IncidentReport> to keep typing broad (no literal-narrowing issues)
    const updateData: Partial<IncidentReport> = { status: 'resolved' };
    const updated = { incidentId, status: 'resolved' };

    const f1uSpy = jest
      .spyOn(IncidentReportModel, 'findOneAndUpdate')
      .mockReturnValue(mockLeanReturn(updated));

    const res = await incidentReportService.updateIncident(
      incidentId,
      updateData
    );

    expect(f1uSpy).toHaveBeenCalledWith({ incidentId }, updateData, {
      new: true,
    });
    expect(res).toEqual(updated);
  });

  it('throws NotFoundError when updating a missing incident', async () => {
    jest
      .spyOn(IncidentReportModel, 'findOneAndUpdate')
      .mockReturnValue(mockLeanReturn(null));

    await expect(
      incidentReportService.updateIncident(
        'aaaaaaaa-aaaa-4aaa-8aaa-missing000000',
        { status: 'closed' } as Partial<IncidentReport>
      )
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  /* ======================================================================== */
  /* deleteIncident                                                           */
  /* ======================================================================== */

  it('resolves when a document was deleted', async () => {
    const delSpy = jest
      .spyOn(IncidentReportModel, 'deleteOne')
      .mockResolvedValue({ deletedCount: 1 } as any);

    await expect(
      incidentReportService.deleteIncident(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'
      )
    ).resolves.toBeUndefined();

    expect(delSpy).toHaveBeenCalledWith({
      incidentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    });
  });

  it('throws NotFoundError when nothing was deleted', async () => {
    jest
      .spyOn(IncidentReportModel, 'deleteOne')
      .mockResolvedValue({ deletedCount: 0 } as any);

    await expect(
      incidentReportService.deleteIncident(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0000'
      )
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  /* ======================================================================== */
  /* listing helpers                                                          */
  /* ======================================================================== */

  it('getAllIncidents sorts by createdAt desc', async () => {
    const rows = [{ incidentId: '1' }, { incidentId: '2' }];
    const chain = mockSortLeanReturn(rows);
    const findSpy = jest
      .spyOn(IncidentReportModel, 'find')
      .mockReturnValue(chain);

    const res = await incidentReportService.getAllIncidents();

    // Assert no filter was passed without indexing into mock.calls
    expect(findSpy).toHaveBeenCalledWith();
    // Assert sorting behavior
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res).toEqual(rows);
  });

  it('getIncidentsByStatus filters by status and sorts desc', async () => {
    const rows = [{ incidentId: '1', status: 'open' }];
    const chain = mockSortLeanReturn(rows);
    const findSpy = jest
      .spyOn(IncidentReportModel, 'find')
      .mockReturnValue(chain);

    const res = await incidentReportService.getIncidentsByStatus('open');
    expect(findSpy).toHaveBeenCalledWith({ status: 'open' });
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res).toEqual(rows);
  });

  it('getIncidentsByLocation with theater only', async () => {
    const rows = [{ incidentId: 'x' }];
    const chain = mockSortLeanReturn(rows);
    const findSpy = jest
      .spyOn(IncidentReportModel, 'find')
      .mockReturnValue(chain);

    const res = await incidentReportService.getIncidentsByLocation('UGC');
    expect(findSpy).toHaveBeenCalledWith({ theaterId: 'UGC' });
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res).toEqual(rows);
  });

  it('getIncidentsByLocation with theater + hall', async () => {
    const rows = [{ incidentId: 'y' }];
    const chain = mockSortLeanReturn(rows);
    const findSpy = jest
      .spyOn(IncidentReportModel, 'find')
      .mockReturnValue(chain);

    const res = await incidentReportService.getIncidentsByLocation('UGC', 'H1');
    expect(findSpy).toHaveBeenCalledWith({ theaterId: 'UGC', hallId: 'H1' });
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res).toEqual(rows);
  });

  it('getIncidentsByUser filters by createdBy', async () => {
    const rows = [{ incidentId: 'z' }];
    const chain = mockSortLeanReturn(rows);
    const findSpy = jest
      .spyOn(IncidentReportModel, 'find')
      .mockReturnValue(chain);

    const uid = '22222222-2222-4222-8222-222222222222';
    const res = await incidentReportService.getIncidentsByUser(uid);
    expect(findSpy).toHaveBeenCalledWith({ createdBy: uid });
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res).toEqual(rows);
  });

  it('getIncidentsByIncidentId filters by incidentId', async () => {
    const rows = [{ incidentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9' }];
    const chain = mockSortLeanReturn(rows);
    const findSpy = jest
      .spyOn(IncidentReportModel, 'find')
      .mockReturnValue(chain);

    const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9';
    const res = await incidentReportService.getIncidentsByIncidentId(id);
    expect(findSpy).toHaveBeenCalledWith({ incidentId: id });
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(res).toEqual(rows);
  });

  /* ======================================================================== */
  /* searchIncidents                                                          */
  /* ======================================================================== */

  it('builds regex filter when `q` is provided', async () => {
    const rows: any[] = [];
    const chain = mockSortLeanReturn(rows);
    const findSpy = jest
      .spyOn(IncidentReportModel, 'find')
      .mockReturnValue(chain);

    await incidentReportService.searchIncidents('flicker', undefined);

    // Use matchers instead of indexing into mock.calls
    expect(findSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        description: { $regex: 'flicker', $options: 'i' },
      })
    );
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it('applies structured filters and date ranges', async () => {
    const rows: any[] = [];
    const chain = mockSortLeanReturn(rows);
    const findSpy = jest
      .spyOn(IncidentReportModel, 'find')
      .mockReturnValue(chain);

    const createdFrom = new Date('2025-01-01T00:00:00Z');
    const createdTo = new Date('2025-01-31T23:59:59Z');
    const updatedFrom = new Date('2025-02-01T00:00:00Z');
    const updatedTo = new Date('2025-02-28T23:59:59Z');

    await incidentReportService.searchIncidents('noise', {
      status: 'in_progress',
      theaterId: 'UGC',
      hallId: 'H1',
      createdBy: '33333333-3333-4333-8333-333333333333',
      incidentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10',
      createdAtFrom: createdFrom,
      createdAtTo: createdTo,
      updatedAtFrom: updatedFrom,
      updatedAtTo: updatedTo,
    });

    // Assert all structured filters without touching mock.calls indexes
    expect(findSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        description: { $regex: 'noise', $options: 'i' },
        status: 'in_progress',
        theaterId: 'UGC',
        hallId: 'H1',
        createdBy: '33333333-3333-4333-8333-333333333333',
        incidentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10',
        createdAt: expect.objectContaining({
          $gte: createdFrom,
          $lte: createdTo,
        }),
        updatedAt: expect.objectContaining({
          $gte: updatedFrom,
          $lte: updatedTo,
        }),
      })
    );

    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });
});
