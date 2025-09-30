import { MovieHallModel } from '../../models/movie-hall.model.js';
import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { ScreeningModel } from '../../models/screening.model.js';
import { MovieModel } from '../../models/movie.model.js';
import { sequelize, loadModels } from '../../config/db.js';
import { registerAssociations } from '../../models/association.js';

describe('MovieHallModel', () => {
  beforeAll(async () => {
    // Load all models into Sequelize
    loadModels();

    // Register associations
    registerAssociations();

    // Sync database with force:true for clean test environment
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  afterEach(async () => {
    // Clean up data between tests
    await MovieHallModel.destroy({ where: {} });
    await MovieTheaterModel.destroy({ where: {} });
  });

  // Helper function to create a theater for testing
  const createTestTheater = async (theaterId: string = 'test-theater') => {
    return await MovieTheaterModel.create({
      theaterId,
      name: 'Test Cinema',
      address: '123 Test Street',
      postalCode: '12345',
      city: 'TestCity',
      phone: '0142865750',
      email: 'test@theater.com',
    });
  };

  it('should have the correct table name', () => {
    expect(MovieHallModel.tableName).toBe('movie_halls');
  });

  it('should create a hall with all required fields', async () => {
    await createTestTheater();

    const hall = await MovieHallModel.create({
      theaterId: 'test-theater',
      hallId: 'hall-1',
      seatsLayout: [
        ['A1', 'A2', 'A3'],
        ['B1', 'B2', 'B3'],
      ],
      quality: 'IMAX',
    });

    expect(hall.theaterId).toBe('test-theater');
    expect(hall.hallId).toBe('hall-1');
    expect(hall.seatsLayout).toEqual([
      ['A1', 'A2', 'A3'],
      ['B1', 'B2', 'B3'],
    ]);
    expect(hall.quality).toBe('IMAX');
    expect(hall.createdAt).toBeDefined();
    expect(hall.updatedAt).toBeDefined();
  });

  it('should use composite primary key (theaterId + hallId)', async () => {
    await createTestTheater('theater-1');
    await createTestTheater('theater-2');

    // Same hallId in different theaters should work
    await MovieHallModel.create({
      theaterId: 'theater-1',
      hallId: 'hall-1',
      seatsLayout: [['A1', 'A2']],
      quality: '2D',
    });

    await MovieHallModel.create({
      theaterId: 'theater-2',
      hallId: 'hall-1',
      seatsLayout: [['B1', 'B2']],
      quality: '3D',
    });

    const halls = await MovieHallModel.findAll();
    expect(halls).toHaveLength(2);

    // Same theaterId + hallId should fail
    await expect(
      MovieHallModel.create({
        theaterId: 'theater-1',
        hallId: 'hall-1',
        seatsLayout: [['C1', 'C2']],
        quality: 'IMAX',
      })
    ).rejects.toThrow();
  });

  it('should validate theaterId length constraints', async () => {
    await createTestTheater('ab'); // Valid short ID

    // Too short (< 2 characters)
    await expect(
      MovieHallModel.create({
        theaterId: 'a',
        hallId: 'hall-1',
        seatsLayout: [['A1']],
        quality: '2D',
      })
    ).rejects.toThrow();

    // Too long (> 36 characters)
    await expect(
      MovieHallModel.create({
        theaterId: 'a'.repeat(37),
        hallId: 'hall-1',
        seatsLayout: [['A1']],
        quality: '2D',
      })
    ).rejects.toThrow();

    // Valid length
    const hall = await MovieHallModel.create({
      theaterId: 'ab',
      hallId: 'hall-1',
      seatsLayout: [['A1']],
      quality: '2D',
    });
    expect(hall.theaterId).toBe('ab');
  });

  it('should validate theaterId format', async () => {
    await createTestTheater('valid-theater_123');

    // Invalid characters (spaces)
    await expect(
      MovieHallModel.create({
        theaterId: 'theater 123',
        hallId: 'hall-1',
        seatsLayout: [['A1']],
        quality: '2D',
      })
    ).rejects.toThrow();

    // Invalid characters (special chars)
    await expect(
      MovieHallModel.create({
        theaterId: 'theater@123',
        hallId: 'hall-1',
        seatsLayout: [['A1']],
        quality: '2D',
      })
    ).rejects.toThrow();

    // Valid format
    const hall = await MovieHallModel.create({
      theaterId: 'valid-theater_123',
      hallId: 'hall-1',
      seatsLayout: [['A1']],
      quality: '2D',
    });
    expect(hall.theaterId).toBe('valid-theater_123');
  });

  it('should validate hallId length constraints', async () => {
    await createTestTheater();

    // Too long (> 16 characters)
    await expect(
      MovieHallModel.create({
        theaterId: 'test-theater',
        hallId: 'a'.repeat(17),
        seatsLayout: [['A1']],
        quality: '2D',
      })
    ).rejects.toThrow();

    // Valid lengths
    const validIds = ['1', 'hall-1', 'IMAX-hall-123'];

    for (const id of validIds) {
      const hall = await MovieHallModel.create({
        theaterId: 'test-theater',
        hallId: id,
        seatsLayout: [['A1']],
        quality: '2D',
      });
      expect(hall.hallId).toBe(id);
      await hall.destroy();
    }
  });

  it('should validate hallId format', async () => {
    await createTestTheater();

    // Invalid characters (spaces)
    await expect(
      MovieHallModel.create({
        theaterId: 'test-theater',
        hallId: 'hall 1',
        seatsLayout: [['A1']],
        quality: '2D',
      })
    ).rejects.toThrow();

    // Invalid characters (special chars)
    await expect(
      MovieHallModel.create({
        theaterId: 'test-theater',
        hallId: 'hall@1',
        seatsLayout: [['A1']],
        quality: '2D',
      })
    ).rejects.toThrow();

    // Valid formats
    const validIds = ['hall-1', 'hall_2', 'H3', 'IMAX-1'];

    for (const id of validIds) {
      const hall = await MovieHallModel.create({
        theaterId: 'test-theater',
        hallId: id,
        seatsLayout: [['A1']],
        quality: '2D',
      });
      expect(hall.hallId).toBe(id);
      await hall.destroy();
    }
  });

  it('should validate seatsLayout as a 2D array', async () => {
    await createTestTheater();

    // Empty array
    await expect(
      MovieHallModel.create({
        theaterId: 'test-theater',
        hallId: 'hall-1',
        seatsLayout: [] as any,
        quality: '2D',
      })
    ).rejects.toThrow();

    // Not an array
    await expect(
      MovieHallModel.create({
        theaterId: 'test-theater',
        hallId: 'hall-2',
        seatsLayout: 'not-an-array' as any,
        quality: '2D',
      })
    ).rejects.toThrow();

    // 1D array (not 2D)
    await expect(
      MovieHallModel.create({
        theaterId: 'test-theater',
        hallId: 'hall-3',
        seatsLayout: ['A1', 'A2', 'A3'] as any,
        quality: '2D',
      })
    ).rejects.toThrow();

    // Empty row
    await expect(
      MovieHallModel.create({
        theaterId: 'test-theater',
        hallId: 'hall-4',
        seatsLayout: [['A1', 'A2'], []],
        quality: '2D',
      })
    ).rejects.toThrow();

    // Valid 2D array
    const hall = await MovieHallModel.create({
      theaterId: 'test-theater',
      hallId: 'hall-5',
      seatsLayout: [
        ['A1', 'A2'],
        ['B1', 'B2'],
      ],
      quality: '2D',
    });
    expect(hall.seatsLayout).toHaveLength(2);
  });

  it('should support string and number seat identifiers', async () => {
    await createTestTheater();

    // String seats
    const hall1 = await MovieHallModel.create({
      theaterId: 'test-theater',
      hallId: 'hall-1',
      seatsLayout: [['A1', 'A2', 'A3']],
      quality: '2D',
    });
    expect(hall1.seatsLayout[0]).toEqual(['A1', 'A2', 'A3']);

    // Numeric seats
    const hall2 = await MovieHallModel.create({
      theaterId: 'test-theater',
      hallId: 'hall-2',
      seatsLayout: [[1, 2, 3]],
      quality: '2D',
    });
    expect(hall2.seatsLayout[0]).toEqual([1, 2, 3]);

    // Mixed seats
    const hall3 = await MovieHallModel.create({
      theaterId: 'test-theater',
      hallId: 'hall-3',
      seatsLayout: [
        ['A1', 'A2', 0],
        [1, 2, 'B3'],
      ],
      quality: '2D',
    });
    expect(hall3.seatsLayout[0]).toEqual(['A1', 'A2', 0]);
    expect(hall3.seatsLayout[1]).toEqual([1, 2, 'B3']);
  });

  it('should reject invalid seat values', async () => {
    await createTestTheater();

    // Empty string seat
    await expect(
      MovieHallModel.create({
        theaterId: 'test-theater',
        hallId: 'hall-1',
        seatsLayout: [['A1', '', 'A3']],
        quality: '2D',
      })
    ).rejects.toThrow();

    // Negative number seat
    await expect(
      MovieHallModel.create({
        theaterId: 'test-theater',
        hallId: 'hall-2',
        seatsLayout: [[1, -1, 3]],
        quality: '2D',
      })
    ).rejects.toThrow();

    // Invalid type (null)
    await expect(
      MovieHallModel.create({
        theaterId: 'test-theater',
        hallId: 'hall-3',
        seatsLayout: [['A1', null, 'A3']] as any,
        quality: '2D',
      })
    ).rejects.toThrow();

    // Invalid type (object)
    await expect(
      MovieHallModel.create({
        theaterId: 'test-theater',
        hallId: 'hall-4',
        seatsLayout: [['A1', { seat: 'A2' }, 'A3']] as any,
        quality: '2D',
      })
    ).rejects.toThrow();
  });

  it('should validate quality enum values', async () => {
    await createTestTheater();

    // Invalid quality
    await expect(
      MovieHallModel.create({
        theaterId: 'test-theater',
        hallId: 'hall-1',
        seatsLayout: [['A1']],
        quality: 'HD' as any,
      })
    ).rejects.toThrow();

    // Valid qualities
    const validQualities: Array<'2D' | '3D' | 'IMAX' | '4DX'> = [
      '2D',
      '3D',
      'IMAX',
      '4DX',
    ];

    for (const quality of validQualities) {
      const hall = await MovieHallModel.create({
        theaterId: 'test-theater',
        hallId: `hall-${quality}`,
        seatsLayout: [['A1', 'A2']],
        quality,
      });
      expect(hall.quality).toBe(quality);
      await hall.destroy();
    }
  });

  it('should default quality to 2D', async () => {
    await createTestTheater();

    const hall = await MovieHallModel.create({
      theaterId: 'test-theater',
      hallId: 'hall-1',
      seatsLayout: [['A1', 'A2']],
      // quality not specified
    } as any);

    expect(hall.quality).toBe('2D');
  });

  it('should have theater association defined', () => {
    const associations = MovieHallModel.associations;
    expect(associations.theater).toBeDefined();
    expect(associations.theater.associationType).toBe('BelongsTo');
  });

  it('should have screenings association defined', () => {
    const associations = MovieHallModel.associations;
    expect(associations.screenings).toBeDefined();
    expect(associations.screenings.associationType).toBe('HasMany');
  });

  it('should load hall with theater association', async () => {
    const theater = await createTestTheater();

    const hall = await MovieHallModel.create({
      theaterId: theater.theaterId,
      hallId: 'hall-1',
      seatsLayout: [['A1', 'A2']],
      quality: 'IMAX',
    });

    const hallWithTheater = await MovieHallModel.findOne({
      where: {
        theaterId: theater.theaterId,
        hallId: 'hall-1',
      },
      include: [{ model: MovieTheaterModel, as: 'theater' }],
    });

    expect(hallWithTheater).toBeDefined();
    expect(hallWithTheater!.theater).toBeDefined();
    expect(hallWithTheater!.theater.theaterId).toBe('test-theater');
    expect(hallWithTheater!.theater.name).toBe('Test Cinema');
  });

  it('should load hall with screenings association', async () => {
    const theater = await createTestTheater();

    const hall = await MovieHallModel.create({
      theaterId: theater.theaterId,
      hallId: 'hall-1',
      seatsLayout: [['A1', 'A2']],
      quality: '2D',
    });

    // Create movie for screenings
    const movie = await MovieModel.create({
      title: 'Test Movie',
      description: 'Test description',
      ageRating: 'PG',
      genre: 'Action',
      releaseDate: new Date('2020-01-01'),
      director: 'Test Director',
      durationMinutes: 120,
    });

    // Create screenings
    await ScreeningModel.create({
      movieId: movie.movieId,
      theaterId: theater.theaterId,
      hallId: hall.hallId,
      startTime: new Date('2025-12-01T19:00:00'),
      price: 12.5,
    });

    await ScreeningModel.create({
      movieId: movie.movieId,
      theaterId: theater.theaterId,
      hallId: hall.hallId,
      startTime: new Date('2025-12-01T21:00:00'),
      price: 15.0,
    });

    const hallWithScreenings = await MovieHallModel.findOne({
      where: {
        theaterId: theater.theaterId,
        hallId: 'hall-1',
      },
      include: [{ model: ScreeningModel, as: 'screenings' }],
    });

    expect(hallWithScreenings).toBeDefined();
    expect(hallWithScreenings!.screenings).toBeDefined();
    expect(hallWithScreenings!.screenings).toHaveLength(2);
  });

  it('should find halls by composite key', async () => {
    await createTestTheater('theater-1');
    await createTestTheater('theater-2');

    await MovieHallModel.create({
      theaterId: 'theater-1',
      hallId: 'hall-1',
      seatsLayout: [['A1', 'A2']],
      quality: '2D',
    });

    await MovieHallModel.create({
      theaterId: 'theater-1',
      hallId: 'hall-2',
      seatsLayout: [['B1', 'B2']],
      quality: '3D',
    });

    await MovieHallModel.create({
      theaterId: 'theater-2',
      hallId: 'hall-1',
      seatsLayout: [['C1', 'C2']],
      quality: 'IMAX',
    });

    // Find specific hall
    const hall = await MovieHallModel.findOne({
      where: {
        theaterId: 'theater-1',
        hallId: 'hall-1',
      },
    });

    expect(hall).toBeDefined();
    expect(hall!.theaterId).toBe('theater-1');
    expect(hall!.hallId).toBe('hall-1');
    expect(hall!.quality).toBe('2D');

    // Find all halls in a theater
    const theater1Halls = await MovieHallModel.findAll({
      where: { theaterId: 'theater-1' },
    });

    expect(theater1Halls).toHaveLength(2);
    expect(theater1Halls.every((h) => h.theaterId === 'theater-1')).toBe(true);
  });

  it('should update hall information', async () => {
    await createTestTheater();

    const hall = await MovieHallModel.create({
      theaterId: 'test-theater',
      hallId: 'hall-1',
      seatsLayout: [['A1', 'A2']],
      quality: '2D',
    });

    await hall.update({
      quality: 'IMAX',
      seatsLayout: [
        ['A1', 'A2', 'A3'],
        ['B1', 'B2', 'B3'],
      ],
    });

    expect(hall.quality).toBe('IMAX');
    expect(hall.seatsLayout).toHaveLength(2);
    expect(hall.seatsLayout[0]).toHaveLength(3);

    // Verify in database
    const updated = await MovieHallModel.findOne({
      where: {
        theaterId: 'test-theater',
        hallId: 'hall-1',
      },
    });

    expect(updated!.quality).toBe('IMAX');
    expect(updated!.seatsLayout).toHaveLength(2);
  });

  it('should find all IMAX halls across theaters', async () => {
    await createTestTheater('theater-1');
    await createTestTheater('theater-2');

    await MovieHallModel.create({
      theaterId: 'theater-1',
      hallId: 'hall-1',
      seatsLayout: [['A1', 'A2']],
      quality: 'IMAX',
    });

    await MovieHallModel.create({
      theaterId: 'theater-1',
      hallId: 'hall-2',
      seatsLayout: [['B1', 'B2']],
      quality: '2D',
    });

    await MovieHallModel.create({
      theaterId: 'theater-2',
      hallId: 'hall-1',
      seatsLayout: [['C1', 'C2']],
      quality: 'IMAX',
    });

    const imaxHalls = await MovieHallModel.findAll({
      where: { quality: 'IMAX' },
    });

    expect(imaxHalls).toHaveLength(2);
    expect(imaxHalls.every((h) => h.quality === 'IMAX')).toBe(true);
  });

  it('should handle timestamps correctly', async () => {
    await createTestTheater();

    const beforeCreate = new Date();

    const hall = await MovieHallModel.create({
      theaterId: 'test-theater',
      hallId: 'hall-1',
      seatsLayout: [['A1', 'A2']],
      quality: '2D',
    });

    const afterCreate = new Date();

    expect(hall.createdAt.getTime()).toBeGreaterThanOrEqual(
      beforeCreate.getTime()
    );
    expect(hall.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    expect(hall.updatedAt.getTime()).toBeGreaterThanOrEqual(
      beforeCreate.getTime()
    );
    expect(hall.updatedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });

  it('should handle complex seat layouts', async () => {
    await createTestTheater();

    // Large cinema hall with multiple rows
    const hall = await MovieHallModel.create({
      theaterId: 'test-theater',
      hallId: 'hall-1',
      seatsLayout: [
        ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8'],
        ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'],
        ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'],
        ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8'],
        ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8'],
      ],
      quality: 'IMAX',
    });

    expect(hall.seatsLayout).toHaveLength(5);
    expect(hall.seatsLayout[0]).toHaveLength(8);
    expect(hall.seatsLayout[4][7]).toBe('E8');
  });
});
