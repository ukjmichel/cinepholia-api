/**
 * @module tests/models/incident-report.model.test
 *
 * @description
 * Jest test suite for the IncidentReport Mongoose model.
 * Mirrors the style of the BookingComment test you shared:
 * - Connects to the test MongoDB from config
 * - Cleans the DB between tests
 * - Validates schema rules (UUIDs, id regex/lengths, enums, trimming)
 * - Asserts default values and immutability
 * - Checks timestamps and JSON transform
 * - Exercises common query patterns and verifies declared indexes
 */

import mongoose from 'mongoose';
import {
  IncidentReport,
  IncidentReportModel,
} from '../../models/incident-report.schema.js';
import { config } from '../../config/env.js';

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('IncidentReportModel', () => {
  beforeAll(async () => {
    await mongoose.connect(config.mongodbUri);
    // Ensure indexes are built before index-related tests
    await IncidentReportModel.createIndexes().catch(() => {
      /* no-op */
    });
  });

  afterAll(async () => {
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await IncidentReportModel.deleteMany({});
  });

  /* ------------------------------------------------------------------------ */
  /*                              Valid creation                              */
  /* ------------------------------------------------------------------------ */

  describe('Valid Incident Creation', () => {
    it('creates with explicit incidentId and fields', async () => {
      const input: Omit<IncidentReport, 'createdAt' | 'updatedAt'> = {
        incidentId: '5e4f3c2b-1a0d-4c9e-8f7e-6d5c4b3a2f10',
        theaterId: 'UGC_Lyon',
        hallId: 'H1',
        description: 'Projector flickering',
        status: 'acknowledged',
        createdBy: '123e4567-e89b-12d3-a456-426614174000',
      };

      const doc = await IncidentReportModel.create(input);

      expect(doc.incidentId).toBe(input.incidentId);
      expect(doc.theaterId).toBe(input.theaterId);
      expect(doc.hallId).toBe(input.hallId);
      expect(doc.description).toBe(input.description);
      expect(doc.status).toBe('acknowledged');
      expect(doc.createdBy).toBe(input.createdBy);
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);

      const json = doc.toJSON() as any;
      expect(json.id).toBeDefined();
      expect(json._id).toBeUndefined();
      expect(json.__v).toBeUndefined();
    });

    it('auto-generates incidentId when omitted and defaults status to "open"', async () => {
      const doc = await IncidentReportModel.create({
        // incidentId omitted
        theaterId: 'Pathe-Bellecour', // <- was "Pathé-Bellecour"
        hallId: 'SALLE_2',
        description: 'Air conditioning not working',
        createdBy: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      } as Omit<IncidentReport, 'createdAt' | 'updatedAt'>);

      expect(doc.incidentId).toMatch(uuidRegex);
      expect(doc.status).toBe('open');
    });

    it('trims description', async () => {
      const doc = await IncidentReportModel.create({
        incidentId: 'e27163b0-08d7-47d0-bb62-b48d312c919f',
        theaterId: 'Cinema_42',
        hallId: 'H-01',
        description: '  Needs cleaning  ',
        createdBy: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        status: 'open',
      });

      expect(doc.description).toBe('Needs cleaning');
    });
  });

  /* ------------------------------------------------------------------------ */
  /*                                 Validation                               */
  /* ------------------------------------------------------------------------ */

  describe('Field Validation', () => {
    describe('UUID fields', () => {
      it('rejects invalid incidentId format', async () => {
        await expect(
          IncidentReportModel.create({
            incidentId: 'not-a-uuid',
            theaterId: 'UGC',
            hallId: 'H1',
            description: 'x',
            createdBy: '123e4567-e89b-12d3-a456-426614174000',
            status: 'open',
          })
        ).rejects.toThrow(/Invalid UUID format for incidentId/i);
      });

      it('rejects invalid createdBy format', async () => {
        await expect(
          IncidentReportModel.create({
            theaterId: 'UGC',
            hallId: 'H1',
            description: 'x',
            createdBy: 'nope',
            status: 'open',
          })
        ).rejects.toThrow(/Invalid UUID format for createdBy/i);
      });

      it('accepts valid v1–v5 UUIDs', async () => {
        const uuids = [
          'e27163b0-08d7-47d0-bb62-b48d312c919f',
          '123e4567-e89b-12d3-a456-426614174000',
          'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        ];
        for (const u of uuids) {
          const doc = await IncidentReportModel.create({
            incidentId: u,
            theaterId: 'OK_Theater',
            hallId: 'Hall-1',
            description: `UUID OK ${u}`,
            createdBy: '5e4f3c2b-1a0d-4c9e-8f7e-6d5c4b3a2f10',
            status: 'open',
          });
          expect(doc.incidentId).toBe(u);
          await IncidentReportModel.deleteOne({ _id: doc._id });
        }
      });
    });

    describe('theaterId / hallId (idRegex + lengths)', () => {
      it('rejects invalid characters', async () => {
        await expect(
          IncidentReportModel.create({
            theaterId: 'Bad Theater', // space
            hallId: 'H1',
            description: 'x',
            createdBy: '123e4567-e89b-12d3-a456-426614174000',
            status: 'open',
          })
        ).rejects.toThrow(/theaterId must contain only/i);

        await expect(
          IncidentReportModel.create({
            theaterId: 'UGC',
            hallId: 'H#1', // hash
            description: 'x',
            createdBy: '123e4567-e89b-12d3-a456-426614174000',
            status: 'open',
          })
        ).rejects.toThrow(/hallId must contain only/i);
      });

      it('enforces min/max lengths', async () => {
        // theaterId too short (<2)
        await expect(
          IncidentReportModel.create({
            theaterId: 'A',
            hallId: 'H1',
            description: 'x',
            createdBy: '123e4567-e89b-12d3-a456-426614174000',
            status: 'open',
          })
        ).rejects.toThrow(/theaterId must be at least 2/i);

        // hallId empty string -> required validator fires for strings
        await expect(
          IncidentReportModel.create({
            theaterId: 'ValidTheater',
            hallId: '', // empty -> "required" error for strings
            description: 'x',
            createdBy: '123e4567-e89b-12d3-a456-426614174000',
            status: 'open',
          })
        ).rejects.toThrow(/hallId is required/i);

        // theaterId too long (>36)
        await expect(
          IncidentReportModel.create({
            theaterId: 'x'.repeat(37),
            hallId: 'H1',
            description: 'x',
            createdBy: '123e4567-e89b-12d3-a456-426614174000',
            status: 'open',
          })
        ).rejects.toThrow(/theaterId cannot exceed 36/i);

        // hallId too long (>16)
        await expect(
          IncidentReportModel.create({
            theaterId: 'Valid',
            hallId: 'x'.repeat(17),
            description: 'x',
            createdBy: '123e4567-e89b-12d3-a456-426614174000',
            status: 'open',
          })
        ).rejects.toThrow(/hallId cannot exceed 16/i);
      });
    });

    describe('description', () => {
      it('requires description and enforces length ≤ 5000', async () => {
        await expect(
          IncidentReportModel.create({
            theaterId: 'UGC',
            hallId: 'H1',
            createdBy: '123e4567-e89b-12d3-a456-426614174000',
            status: 'open',
          } as any)
        ).rejects.toThrow(/description is required/i);

        await expect(
          IncidentReportModel.create({
            theaterId: 'UGC',
            hallId: 'H1',
            description: '',
            createdBy: '123e4567-e89b-12d3-a456-426614174000',
            status: 'open',
          })
        ).rejects.toThrow(/description is required/i);

        const tooLong = 'a'.repeat(5001);
        await expect(
          IncidentReportModel.create({
            theaterId: 'UGC',
            hallId: 'H1',
            description: tooLong,
            createdBy: '123e4567-e89b-12d3-a456-426614174000',
            status: 'open',
          })
        ).rejects.toThrow(/cannot exceed 5000/i);

        const maxLen = 'a'.repeat(5000);
        const ok = await IncidentReportModel.create({
          theaterId: 'UGC',
          hallId: 'H1',
          description: maxLen,
          createdBy: '123e4567-e89b-12d3-a456-426614174000',
          status: 'open',
        });
        expect(ok.description.length).toBe(5000);
      });
    });

    describe('status enum', () => {
      it('defaults to "open" when not provided', async () => {
        const doc = await IncidentReportModel.create({
          theaterId: 'Default_Theater',
          hallId: 'Hall-2',
          description: 'No status provided',
          createdBy: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        } as any);
        expect(doc.status).toBe('open');
      });

      it('rejects invalid statuses', async () => {
        await expect(
          IncidentReportModel.create({
            theaterId: 'UGC',
            hallId: 'H1',
            description: 'x',
            createdBy: '123e4567-e89b-12d3-a456-426614174000',
            status: 'bad_status' as any,
          })
        ).rejects.toThrow(/status must be one of/i);
      });
    });
  });

  /* ------------------------------------------------------------------------ */
  /*                               Immutability                               */
  /* ------------------------------------------------------------------------ */

  describe('Immutability', () => {
    it('does not allow changing incidentId after creation (document save)', async () => {
      const originalId = '5e4f3c2b-1a0d-4c9e-8f7e-6d5c4b3a2f10';
      const doc = await IncidentReportModel.create({
        incidentId: originalId,
        theaterId: 'UGC_Lyon',
        hallId: 'H1',
        description: 'Immutable test',
        createdBy: '123e4567-e89b-12d3-a456-426614174000',
        status: 'open',
      });

      const newId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      (doc as any).incidentId = newId;
      await doc.save();

      const fetched = await IncidentReportModel.findById(doc._id).lean();
      expect(fetched!.incidentId).toBe(originalId); // unchanged
      expect(fetched!.incidentId).not.toBe(newId);
    });
  });

  /* ------------------------------------------------------------------------ */
  /*                                Timestamps                                */
  /* ------------------------------------------------------------------------ */

  describe('Timestamps', () => {
    it('sets createdAt and updatedAt on creation', async () => {
      const before = new Date();
      const doc = await IncidentReportModel.create({
        theaterId: 'Time_Theater',
        hallId: 'H-7',
        description: 'Timestamp test',
        createdBy: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      } as any);
      const after = new Date();

      expect(doc.createdAt).toBeDefined();
      expect(doc.updatedAt).toBeDefined();
      expect(doc.createdAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(doc.createdAt!.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(doc.updatedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(doc.updatedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('updates updatedAt on save, not createdAt', async () => {
      const doc = await IncidentReportModel.create({
        theaterId: 'TickTock',
        hallId: 'H-99',
        description: 'Original',
        createdBy: '123e4567-e89b-12d3-a456-426614174000',
      } as any);

      const createdAt = doc.createdAt!;
      const firstUpdated = doc.updatedAt!;

      await new Promise((r) => setTimeout(r, 10));
      doc.description = 'Updated';
      await doc.save();

      expect(doc.createdAt!.toISOString()).toBe(createdAt.toISOString());
      expect(doc.updatedAt!.getTime()).toBeGreaterThan(firstUpdated.getTime());
    });
  });

  /* ------------------------------------------------------------------------ */
  /*                             JSON transformation                          */
  /* ------------------------------------------------------------------------ */

  describe('JSON Transformation', () => {
    it('exposes id and hides _id/__v', async () => {
      const doc = await IncidentReportModel.create({
        theaterId: 'JSON_Cinema',
        hallId: 'H_JSON',
        description: 'Transform test',
        createdBy: '123e4567-e89b-12d3-a456-426614174000',
      } as any);

      const json = doc.toJSON() as any;
      expect(json.id).toBeDefined();
      expect(typeof json.id).toBe('string');
      expect(json._id).toBeUndefined();
      expect(json.__v).toBeUndefined();
      expect(json.theaterId).toBe('JSON_Cinema');
      expect(json.hallId).toBe('H_JSON');
      expect(json.description).toBe('Transform test');
      expect(json.status).toBe('open');
    });
  });

  /* ------------------------------------------------------------------------ */
  /*                               Query operations                           */
  /* ------------------------------------------------------------------------ */

  describe('Query Operations', () => {
    beforeEach(async () => {
      await IncidentReportModel.create([
        {
          incidentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
          theaterId: 'A_Theater',
          hallId: 'H1',
          description: 'A1',
          status: 'open',
          createdBy: '11111111-1111-4111-8111-111111111111',
        },
        {
          incidentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
          theaterId: 'A_Theater',
          hallId: 'H2',
          description: 'A2',
          status: 'resolved',
          createdBy: '22222222-2222-4222-8222-222222222222',
        },
        {
          incidentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
          theaterId: 'B-Theater',
          hallId: 'H2',
          description: 'B1',
          status: 'in_progress',
          createdBy: '11111111-1111-4111-8111-111111111111',
        },
      ] as Omit<IncidentReport, 'createdAt' | 'updatedAt'>[]);
    });

    it('finds by status', async () => {
      const resolved = await IncidentReportModel.find({ status: 'resolved' });
      expect(resolved).toHaveLength(1);
      expect(resolved[0].description).toBe('A2');
    });

    it('finds by location (theater only)', async () => {
      const aTheater = await IncidentReportModel.find({
        theaterId: 'A_Theater',
      });
      expect(aTheater).toHaveLength(2);
    });

    it('finds by location (theater + hall)', async () => {
      const hall2 = await IncidentReportModel.find({
        theaterId: 'A_Theater',
        hallId: 'H2',
      });
      expect(hall2).toHaveLength(1);
      expect(hall2[0].description).toBe('A2');
    });

    it('finds by createdBy', async () => {
      const byUser1 = await IncidentReportModel.find({
        createdBy: '11111111-1111-4111-8111-111111111111',
      });
      expect(byUser1).toHaveLength(2);
    });

    it('finds by incidentId', async () => {
      const items = await IncidentReportModel.find({
        incidentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
      });
      expect(items).toHaveLength(1);
      expect(items[0].description).toBe('B1');
    });
  });

  /* ------------------------------------------------------------------------ */
  /*                                  Indexes                                 */
  /* ------------------------------------------------------------------------ */

  describe('Indexes', () => {
    it('declares explicit helpful indexes in the schema', async () => {
      const schemaIndexes = IncidentReportModel.schema.indexes();
      // Expect the explicit indexes defined in the schema file:
      //   - { incidentId: 1 }
      //   - { theaterId: 1, hallId: 1, createdAt: -1 }
      expect(schemaIndexes).toEqual(
        expect.arrayContaining([
          [{ incidentId: 1 }, expect.any(Object)],
          [{ theaterId: 1, hallId: 1, createdAt: -1 }, expect.any(Object)],
        ])
      );
    });

    it('creates the status index at the collection level', async () => {
      // path-level index({ index: true }) ends up at the collection
      const indexes = await IncidentReportModel.collection.indexes();
      const hasStatusIndex = indexes.some((idx: any) => {
        return idx.key && idx.key.status === 1;
      });
      expect(hasStatusIndex).toBe(true);
    });
  });
});
