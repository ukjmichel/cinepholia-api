import { Sequelize } from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';
import {
  IncidentReportModel,
  IncidentReportAttributes,
} from '../../models/incident-report.model.js';
import { UserModel } from '../../models/user.model.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { MovieHallModel } from '../../models/movie-hall.model.js';
import { ScreeningModel } from '../../models/screening.model.js';
import { MovieModel } from '../../models/movie.model.js';
import { BookingModel } from '../../models/booking.model.js';

describe('IncidentReportModel', () => {
  let sequelize: Sequelize;

  // Shared IDs for referential integrity in each test
  const userId = uuidv4();
  const theaterId = 'theater1';
  const hallId = 'hallA';

  beforeAll(async () => {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
      // Add all models from your application to avoid association errors
      models: [
        IncidentReportModel,
        UserModel,
        MovieTheaterModel,
        MovieHallModel,
        ScreeningModel,
        MovieModel,
        BookingModel,
      ],
    });

    await sequelize.sync({ force: true });

    // Create persistent dependencies only once for all tests
    await UserModel.create({
      userId,
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'password123',
      verified: true,
    });

    await MovieTheaterModel.create({
      theaterId,
      address: '456 Theater Ave',
      postalCode: '75001',
      city: 'Paris',
      phone: '0102030406',
      email: 'contact@theater.com',
    });

    await MovieHallModel.create({
      theaterId,
      hallId,
      seatsLayout: [
        [1, 2, 3, 4],
        [5, 6, 7, 8],
        [9, 10, 11, 12],
      ],
    });
  });

  afterAll(async () => {
    if (sequelize) await sequelize.close();
  });

  beforeEach(async () => {
    // Only destroy incident reports for isolation
    await IncidentReportModel.destroy({ where: {} });
  });

  it('should create an incident report with valid attributes and associate with User, Theater, and Hall', async () => {
    const incidentReport = await IncidentReportModel.create({
      incidentId: uuidv4(),
      theaterId,
      hallId,
      title: 'Broken seat in row 2',
      description:
        'Seat number 6 is completely broken and cannot be used by customers.',
      status: 'pending' as const,
      date: new Date(),
      userId,
    });

    expect(incidentReport).toBeDefined();
    expect(incidentReport.theaterId).toBe(theaterId);
    expect(incidentReport.hallId).toBe(hallId);
    expect(incidentReport.title).toBe('Broken seat in row 2');
    expect(incidentReport.description).toBe(
      'Seat number 6 is completely broken and cannot be used by customers.'
    );
    expect(incidentReport.status).toBe('pending');
    expect(incidentReport.userId).toBe(userId);
    expect(incidentReport.date).toBeDefined();

    // Fetch with associations
    const foundIncident = await IncidentReportModel.findByPk(
      incidentReport.incidentId,
      {
        include: [UserModel, MovieTheaterModel, MovieHallModel],
      }
    );

    expect(foundIncident).toBeDefined();
    expect(foundIncident!.user).toBeDefined();
    expect(foundIncident!.user.username).toBe('johndoe');
    expect(foundIncident!.user.email).toBe('john.doe@example.com');
    expect(foundIncident!.theater).toBeDefined();
    expect(foundIncident!.theater.theaterId).toBe(theaterId);
    expect(foundIncident!.hall).toBeDefined();
    expect(foundIncident!.hall.hallId).toBe(hallId);
  });

  it('should default status to pending when not specified', async () => {
    const incidentReport = await IncidentReportModel.create({
      incidentId: uuidv4(),
      theaterId,
      hallId,
      title: 'Audio system malfunction',
      description:
        'The audio system is not working properly during screenings.',
      date: new Date(),
      userId,
    });

    expect(incidentReport.status).toBe('pending');
  });

  it('should default date to current time when not specified', async () => {
    const beforeCreate = new Date();

    const incidentReport = await IncidentReportModel.create({
      incidentId: uuidv4(),
      theaterId,
      hallId,
      title: 'Lighting issue',
      description: 'Emergency exit lights are not functioning correctly.',
      status: 'pending' as const,
      userId,
    });

    const afterCreate = new Date();

    expect(incidentReport.date).toBeDefined();
    expect(incidentReport.date.getTime()).toBeGreaterThanOrEqual(
      beforeCreate.getTime()
    );
    expect(incidentReport.date.getTime()).toBeLessThanOrEqual(
      afterCreate.getTime()
    );
  });

  it('should accept all valid status values', async () => {
    const statuses: Array<IncidentReportAttributes['status']> = [
      'pending',
      'in_progress',
      'fulfilled',
    ];

    for (const status of statuses) {
      const incidentReport = await IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId,
        hallId,
        title: `Incident with ${status} status`,
        description: 'Testing different status values.',
        status,
        date: new Date(),
        userId,
      });

      expect(incidentReport.status).toBe(status);
    }
  });

  it('should reject invalid status values', async () => {
    await expect(
      IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId,
        hallId,
        title: 'Invalid status test',
        description: 'This should fail due to invalid status.',
        status: 'invalid_status' as IncidentReportAttributes['status'],
        date: new Date(),
        userId,
      })
    ).rejects.toThrow();
  });

  it('should require title to be between 3 and 255 characters', async () => {
    // Test title too short
    await expect(
      IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId,
        hallId,
        title: 'AB', // Only 2 characters
        description: 'Valid description here.',
        date: new Date(),
        userId,
      })
    ).rejects.toThrow();

    // Test title too long
    const longTitle = 'A'.repeat(256); // 256 characters
    await expect(
      IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId,
        hallId,
        title: longTitle,
        description: 'Valid description here.',
        date: new Date(),
        userId,
      })
    ).rejects.toThrow();

    // Test valid title length
    const validIncident = await IncidentReportModel.create({
      incidentId: uuidv4(),
      theaterId,
      hallId,
      title: 'Valid title length',
      description: 'Valid description here.',
      date: new Date(),
      userId,
    });

    expect(validIncident).toBeDefined();
  });

  it('should require description to be between 5 and 2000 characters', async () => {
    // Test description too short
    await expect(
      IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId,
        hallId,
        title: 'Valid title',
        description: 'Test', // Only 4 characters
        date: new Date(),
        userId,
      })
    ).rejects.toThrow();

    // Test description too long
    const longDescription = 'A'.repeat(2001); // 2001 characters
    await expect(
      IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId,
        hallId,
        title: 'Valid title',
        description: longDescription,
        date: new Date(),
        userId,
      })
    ).rejects.toThrow();

    // Test valid description length
    const validIncident = await IncidentReportModel.create({
      incidentId: uuidv4(),
      theaterId,
      hallId,
      title: 'Valid title',
      description: 'This is a valid description with proper length.',
      date: new Date(),
      userId,
    });

    expect(validIncident).toBeDefined();
  });

  it('should reject title and description containing HTML tags', async () => {
    // Test title with HTML tags
    await expect(
      IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId,
        hallId,
        title: 'Title with <script>alert("xss")</script> tags',
        description: 'Valid description here.',
        date: new Date(),
        userId,
      })
    ).rejects.toThrow();

    // Test description with HTML tags
    await expect(
      IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId,
        hallId,
        title: 'Valid title',
        description: 'Description with <div>HTML tags</div> should fail.',
        date: new Date(),
        userId,
      })
    ).rejects.toThrow();
  });

  it('should reject empty title and description', async () => {
    // Test empty title
    await expect(
      IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId,
        hallId,
        title: '',
        description: 'Valid description here.',
        date: new Date(),
        userId,
      })
    ).rejects.toThrow();

    // Test empty description
    await expect(
      IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId,
        hallId,
        title: 'Valid title',
        description: '',
        date: new Date(),
        userId,
      })
    ).rejects.toThrow();
  });

  it('should reject future dates', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1); // Tomorrow

    await expect(
      IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId,
        hallId,
        title: 'Future incident',
        description: 'This incident is scheduled for the future.',
        date: futureDate,
        userId,
      })
    ).rejects.toThrow('Incident date cannot be in the future');
  });

  it('should reject dates more than one year ago', async () => {
    const oldDate = new Date();
    oldDate.setFullYear(oldDate.getFullYear() - 2); // Two years ago

    await expect(
      IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId,
        hallId,
        title: 'Very old incident',
        description: 'This incident happened too long ago.',
        date: oldDate,
        userId,
      })
    ).rejects.toThrow('Incident date cannot be more than one year ago');
  });

  it('should accept dates within the valid range', async () => {
    const validDate = new Date();
    validDate.setMonth(validDate.getMonth() - 6); // 6 months ago

    const incidentReport = await IncidentReportModel.create({
      incidentId: uuidv4(),
      theaterId,
      hallId,
      title: 'Valid date incident',
      description: 'This incident has a valid date.',
      date: validDate,
      userId,
    });

    expect(incidentReport).toBeDefined();
    expect(incidentReport.date).toEqual(validDate);
  });

  it('should require all foreign key references', async () => {
    // Test missing theaterId
    await expect(
      IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId: null as unknown as string,
        hallId,
        title: 'Missing theater',
        description: 'This should fail due to missing theater reference.',
        date: new Date(),
        userId,
      })
    ).rejects.toThrow();

    // Test missing hallId
    await expect(
      IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId,
        hallId: null as unknown as string,
        title: 'Missing hall',
        description: 'This should fail due to missing hall reference.',
        date: new Date(),
        userId,
      })
    ).rejects.toThrow();

    // Test missing userId
    await expect(
      IncidentReportModel.create({
        incidentId: uuidv4(),
        theaterId,
        hallId,
        title: 'Missing user',
        description: 'This should fail due to missing user reference.',
        date: new Date(),
        userId: null as unknown as string,
      })
    ).rejects.toThrow();
  });

  it('should generate UUID for incidentId when not provided', async () => {
    const incidentReport = await IncidentReportModel.create({
      theaterId,
      hallId,
      title: 'Auto-generated ID test',
      description: 'Testing automatic UUID generation for incident ID.',
      status: 'pending' as const,
      date: new Date(),
      userId,
    });

    expect(incidentReport.incidentId).toBeDefined();
    expect(typeof incidentReport.incidentId).toBe('string');
    expect(incidentReport.incidentId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('should have timestamps for createdAt and updatedAt', async () => {
    const beforeCreate = new Date();

    const incidentReport = await IncidentReportModel.create({
      incidentId: uuidv4(),
      theaterId,
      hallId,
      title: 'Timestamp test',
      description: 'Testing automatic timestamp generation.',
      status: 'pending' as const,
      date: new Date(),
      userId,
    });

    const afterCreate = new Date();

    expect(incidentReport.createdAt).toBeDefined();
    expect(incidentReport.updatedAt).toBeDefined();
    expect(incidentReport.createdAt!.getTime()).toBeGreaterThanOrEqual(
      beforeCreate.getTime()
    );
    expect(incidentReport.createdAt!.getTime()).toBeLessThanOrEqual(
      afterCreate.getTime()
    );
    expect(incidentReport.updatedAt!.getTime()).toBeGreaterThanOrEqual(
      beforeCreate.getTime()
    );
    expect(incidentReport.updatedAt!.getTime()).toBeLessThanOrEqual(
      afterCreate.getTime()
    );
  });
});
