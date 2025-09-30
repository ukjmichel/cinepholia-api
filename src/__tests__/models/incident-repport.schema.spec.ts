import mongoose from 'mongoose';
import { IncidentReportModel } from '../../models/incident-report.schema';
import connectMongoDB from '../../config/mongo';
import { randomUUID } from 'crypto';

describe('IncidentReportModel (real DB)', () => {
  beforeAll(async () => {
    await connectMongoDB();
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  afterEach(async () => {
    await IncidentReportModel.deleteMany({});
  });

  describe('Creation', () => {
    it('should create an incident report with all required fields', async () => {
      const createdBy = randomUUID();
      const incident = await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-A',
        description: 'Broken projector in hall A',
        createdBy,
      });

      expect(incident._id).toBeDefined();
      expect(incident.incidentId).toBeDefined();
      expect(incident.incidentId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
      expect(incident.theaterId).toBe('theater-01');
      expect(incident.hallId).toBe('hall-A');
      expect(incident.description).toBe('Broken projector in hall A');
      expect(incident.status).toBe('open'); // default value
      expect(incident.createdBy).toBe(createdBy);
      expect(incident.createdAt).toBeDefined();
      expect(incident.updatedAt).toBeDefined();
    });

    it('should auto-generate incidentId if not provided', async () => {
      const incident1 = await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-1',
        description: 'First incident',
        createdBy: randomUUID(),
      });

      const incident2 = await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-2',
        description: 'Second incident',
        createdBy: randomUUID(),
      });

      expect(incident1.incidentId).toBeDefined();
      expect(incident2.incidentId).toBeDefined();
      expect(incident1.incidentId).not.toBe(incident2.incidentId);
    });

    it('should accept custom incidentId if provided', async () => {
      const customIncidentId = randomUUID();
      const incident = await IncidentReportModel.create({
        incidentId: customIncidentId,
        theaterId: 'theater-01',
        hallId: 'hall-1',
        description: 'Custom incident',
        createdBy: randomUUID(),
      });

      expect(incident.incidentId).toBe(customIncidentId);
    });

    it('should create incident with custom status', async () => {
      const incident = await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-1',
        description: 'Acknowledged incident',
        status: 'acknowledged',
        createdBy: randomUUID(),
      });

      expect(incident.status).toBe('acknowledged');
    });

    it('should trim description whitespace', async () => {
      const incident = await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-1',
        description: '  Whitespace around text  ',
        createdBy: randomUUID(),
      });

      expect(incident.description).toBe('Whitespace around text');
    });
  });

  describe('Validation', () => {
    it('should fail if theaterId is missing', async () => {
      await expect(
        IncidentReportModel.create({
          hallId: 'hall-1',
          description: 'Missing theater',
          createdBy: randomUUID(),
        } as any)
      ).rejects.toThrow(/theaterId is required/);
    });

    it('should fail if hallId is missing', async () => {
      await expect(
        IncidentReportModel.create({
          theaterId: 'theater-01',
          description: 'Missing hall',
          createdBy: randomUUID(),
        } as any)
      ).rejects.toThrow(/hallId is required/);
    });

    it('should fail if description is missing', async () => {
      await expect(
        IncidentReportModel.create({
          theaterId: 'theater-01',
          hallId: 'hall-1',
          createdBy: randomUUID(),
        } as any)
      ).rejects.toThrow(/description is required/);
    });

    it('should fail if createdBy is missing', async () => {
      await expect(
        IncidentReportModel.create({
          theaterId: 'theater-01',
          hallId: 'hall-1',
          description: 'Missing creator',
        } as any)
      ).rejects.toThrow(/createdBy is required/);
    });

    it('should fail if createdBy is not a valid UUID', async () => {
      await expect(
        IncidentReportModel.create({
          theaterId: 'theater-01',
          hallId: 'hall-1',
          description: 'Invalid creator UUID',
          createdBy: 'not-a-uuid',
        })
      ).rejects.toThrow(/Invalid UUID format for createdBy/);
    });

    it('should fail if incidentId is not a valid UUID', async () => {
      await expect(
        IncidentReportModel.create({
          incidentId: 'invalid-uuid',
          theaterId: 'theater-01',
          hallId: 'hall-1',
          description: 'Invalid incident UUID',
          createdBy: randomUUID(),
        })
      ).rejects.toThrow(/Invalid UUID format for incidentId/);
    });

    it('should fail if status is invalid', async () => {
      await expect(
        IncidentReportModel.create({
          theaterId: 'theater-01',
          hallId: 'hall-1',
          description: 'Invalid status',
          status: 'invalid_status' as any,
          createdBy: randomUUID(),
        })
      ).rejects.toThrow(/status must be one of/);
    });

    it('should fail if theaterId is too short', async () => {
      await expect(
        IncidentReportModel.create({
          theaterId: 'a', // Only 1 character
          hallId: 'hall-1',
          description: 'Theater ID too short',
          createdBy: randomUUID(),
        })
      ).rejects.toThrow(/theaterId must be at least 2 characters/);
    });

    it('should fail if theaterId is too long', async () => {
      await expect(
        IncidentReportModel.create({
          theaterId: 'a'.repeat(37), // 37 characters
          hallId: 'hall-1',
          description: 'Theater ID too long',
          createdBy: randomUUID(),
        })
      ).rejects.toThrow(/theaterId cannot exceed 36 characters/);
    });

    it('should fail if hallId is too long', async () => {
      await expect(
        IncidentReportModel.create({
          theaterId: 'theater-01',
          hallId: 'a'.repeat(17), // 17 characters
          description: 'Hall ID too long',
          createdBy: randomUUID(),
        })
      ).rejects.toThrow(/hallId cannot exceed 16 characters/);
    });

    it('should fail if description is too long', async () => {
      await expect(
        IncidentReportModel.create({
          theaterId: 'theater-01',
          hallId: 'hall-1',
          description: 'a'.repeat(5001), // 5001 characters
          createdBy: randomUUID(),
        })
      ).rejects.toThrow(/description cannot exceed 5000 characters/);
    });

    it('should fail if theaterId contains invalid characters', async () => {
      await expect(
        IncidentReportModel.create({
          theaterId: 'theater@01', // Contains @
          hallId: 'hall-1',
          description: 'Invalid theater ID',
          createdBy: randomUUID(),
        })
      ).rejects.toThrow(
        /theaterId must contain only letters, numbers, underscores, or hyphens/
      );
    });

    it('should fail if hallId contains invalid characters', async () => {
      await expect(
        IncidentReportModel.create({
          theaterId: 'theater-01',
          hallId: 'hall#1', // Contains #
          description: 'Invalid hall ID',
          createdBy: randomUUID(),
        })
      ).rejects.toThrow(
        /hallId must contain only letters, numbers, underscores, or hyphens/
      );
    });
  });

  describe('Immutability', () => {
    it('should prevent incidentId from being changed after creation', async () => {
      const incident = await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-1',
        description: 'Original incident',
        createdBy: randomUUID(),
      });

      const originalIncidentId = incident.incidentId;

      // Try to change incidentId
      incident.incidentId = randomUUID();
      await incident.save();

      // Verify incidentId hasn't changed
      const found = await IncidentReportModel.findById(incident._id);
      expect(found!.incidentId).toBe(originalIncidentId);
    });
  });

  describe('Updates', () => {
    it('should update incident status', async () => {
      const incident = await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-1',
        description: 'Needs acknowledgment',
        createdBy: randomUUID(),
      });

      incident.status = 'acknowledged';
      await incident.save();

      const found = await IncidentReportModel.findById(incident._id);
      expect(found!.status).toBe('acknowledged');
    });

    it('should update description', async () => {
      const incident = await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-1',
        description: 'Initial description',
        createdBy: randomUUID(),
      });

      incident.description = 'Updated description with more details';
      await incident.save();

      const found = await IncidentReportModel.findById(incident._id);
      expect(found!.description).toBe('Updated description with more details');
    });

    it('should update updatedAt timestamp on modification', async () => {
      const incident = await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-1',
        description: 'Original',
        createdBy: randomUUID(),
      });

      const originalUpdatedAt = incident.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      incident.description = 'Modified';
      await incident.save();

      expect(incident.updatedAt!.getTime()).toBeGreaterThan(
        originalUpdatedAt!.getTime()
      );
    });
  });

  describe('Queries', () => {
    it('should retrieve incident by incidentId', async () => {
      const createdIncident = await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-1',
        description: 'Find by incident ID',
        createdBy: randomUUID(),
      });

      const found = await IncidentReportModel.findOne({
        incidentId: createdIncident.incidentId,
      });

      expect(found).toBeDefined();
      expect(found!.incidentId).toBe(createdIncident.incidentId);
      expect(found!.description).toBe('Find by incident ID');
    });

    it('should retrieve incidents by theaterId and hallId', async () => {
      await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-A',
        description: 'First incident in hall A',
        createdBy: randomUUID(),
      });

      await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-A',
        description: 'Second incident in hall A',
        createdBy: randomUUID(),
      });

      await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-B',
        description: 'Incident in hall B',
        createdBy: randomUUID(),
      });

      const incidents = await IncidentReportModel.find({
        theaterId: 'theater-01',
        hallId: 'hall-A',
      });

      expect(incidents).toHaveLength(2);
      expect(incidents.every((i) => i.hallId === 'hall-A')).toBe(true);
    });

    it('should retrieve incidents by status', async () => {
      await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-1',
        description: 'Open incident 1',
        status: 'open',
        createdBy: randomUUID(),
      });

      await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-2',
        description: 'Resolved incident',
        status: 'resolved',
        createdBy: randomUUID(),
      });

      await IncidentReportModel.create({
        theaterId: 'theater-02',
        hallId: 'hall-1',
        description: 'Open incident 2',
        status: 'open',
        createdBy: randomUUID(),
      });

      const openIncidents = await IncidentReportModel.find({ status: 'open' });

      expect(openIncidents).toHaveLength(2);
      expect(openIncidents.every((i) => i.status === 'open')).toBe(true);
    });

    it('should retrieve incidents by createdBy', async () => {
      const userId = randomUUID();
      const otherUserId = randomUUID();

      await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-1',
        description: 'User incident 1',
        createdBy: userId,
      });

      await IncidentReportModel.create({
        theaterId: 'theater-02',
        hallId: 'hall-2',
        description: 'User incident 2',
        createdBy: userId,
      });

      await IncidentReportModel.create({
        theaterId: 'theater-03',
        hallId: 'hall-3',
        description: 'Other user incident',
        createdBy: otherUserId,
      });

      const userIncidents = await IncidentReportModel.find({
        createdBy: userId,
      });

      expect(userIncidents).toHaveLength(2);
      expect(userIncidents.every((i) => i.createdBy === userId)).toBe(true);
    });

    it('should sort incidents by createdAt descending', async () => {
      await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-1',
        description: 'First incident',
        createdBy: randomUUID(),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-1',
        description: 'Second incident',
        createdBy: randomUUID(),
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-1',
        description: 'Third incident',
        createdBy: randomUUID(),
      });

      const incidents = await IncidentReportModel.find({
        theaterId: 'theater-01',
        hallId: 'hall-1',
      }).sort({ createdAt: -1 });

      expect(incidents).toHaveLength(3);
      expect(incidents[0].description).toBe('Third incident');
      expect(incidents[1].description).toBe('Second incident');
      expect(incidents[2].description).toBe('First incident');
    });
  });

  describe('Status Workflow', () => {
    it('should allow status progression through workflow', async () => {
      const incident = await IncidentReportModel.create({
        theaterId: 'theater-01',
        hallId: 'hall-1',
        description: 'Status workflow test',
        createdBy: randomUUID(),
      });

      expect(incident.status).toBe('open');

      incident.status = 'acknowledged';
      await incident.save();
      expect(incident.status).toBe('acknowledged');

      incident.status = 'in_progress';
      await incident.save();
      expect(incident.status).toBe('in_progress');

      incident.status = 'resolved';
      await incident.save();
      expect(incident.status).toBe('resolved');

      incident.status = 'closed';
      await incident.save();
      expect(incident.status).toBe('closed');
    });
  });
});
