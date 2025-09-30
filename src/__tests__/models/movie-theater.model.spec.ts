import { MovieTheaterModel } from '../../models/movie-theater.model.js';
import { MovieHallModel } from '../../models/movie-hall.model.js';
import { ScreeningModel } from '../../models/screening.model.js';
import { MovieModel } from '../../models/movie.model.js';
import { sequelize, loadModels } from '../../config/db.js';
import { registerAssociations } from '../../models/association.js';

describe('MovieTheaterModel', () => {
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
    // Clean up theaters between tests
    await MovieTheaterModel.destroy({ where: {} });
  });

  it('should have the correct table name', () => {
    expect(MovieTheaterModel.tableName).toBe('movie_theaters');
  });

  it('should create a theater with all required fields', async () => {
    const theater = await MovieTheaterModel.create({
      theaterId: 'theater-downtown',
      name: 'Cinema Paradiso',
      address: '123 Main Street',
      postalCode: '75001',
      city: 'Paris',
      phone: '+33 1 42 86 57 50',
      email: 'contact@cinema-paradiso.fr',
    });

    expect(theater.theaterId).toBe('theater-downtown');
    expect(theater.name).toBe('Cinema Paradiso');
    expect(theater.address).toBe('123 Main Street');
    expect(theater.postalCode).toBe('75001');
    expect(theater.city).toBe('Paris');
    expect(theater.phone).toBe('+33 1 42 86 57 50');
    expect(theater.email).toBe('contact@cinema-paradiso.fr');
    expect(theater.createdAt).toBeDefined();
    expect(theater.updatedAt).toBeDefined();
  });

  it('should validate theaterId length constraints', async () => {
    // Too short (< 2 characters)
    await expect(
      MovieTheaterModel.create({
        theaterId: 'a',
        name: 'Test Theater',
        address: '123 Main Street',
        postalCode: '12345',
        city: 'TestCity',
        phone: '0142865750',
        email: 'test@theater.com',
      })
    ).rejects.toThrow();

    // Too long (> 36 characters)
    await expect(
      MovieTheaterModel.create({
        theaterId: 'a'.repeat(37),
        name: 'Test Theater',
        address: '123 Main Street',
        postalCode: '12345',
        city: 'TestCity',
        phone: '0142865750',
        email: 'test@theater.com',
      })
    ).rejects.toThrow();

    // Valid length
    const theater = await MovieTheaterModel.create({
      theaterId: 'ab',
      name: 'Test Theater',
      address: '123 Main Street',
      postalCode: '12345',
      city: 'TestCity',
      phone: '0142865750',
      email: 'test@theater.com',
    });
    expect(theater.theaterId).toBe('ab');
  });

  it('should validate theaterId format', async () => {
    // Invalid characters (spaces)
    await expect(
      MovieTheaterModel.create({
        theaterId: 'theater downtown',
        name: 'Test Theater',
        address: '123 Main Street',
        postalCode: '12345',
        city: 'TestCity',
        phone: '0142865750',
        email: 'test@theater.com',
      })
    ).rejects.toThrow();

    // Invalid characters (special chars)
    await expect(
      MovieTheaterModel.create({
        theaterId: 'theater@downtown',
        name: 'Test Theater',
        address: '123 Main Street',
        postalCode: '12345',
        city: 'TestCity',
        phone: '0142865750',
        email: 'test@theater.com',
      })
    ).rejects.toThrow();

    // Valid formats
    const validIds = [
      'theater-1',
      'cinema_123',
      'IMAX-Paris-01',
      'test_theater-99',
    ];

    for (const id of validIds) {
      const theater = await MovieTheaterModel.create({
        theaterId: id,
        name: 'Test Theater',
        address: '123 Main Street',
        postalCode: '12345',
        city: 'TestCity',
        phone: '0142865750',
        email: 'test@theater.com',
      });
      expect(theater.theaterId).toBe(id);
      await theater.destroy();
    }
  });

  it('should enforce unique theaterId', async () => {
    await MovieTheaterModel.create({
      theaterId: 'duplicate-id',
      name: 'Theater 1',
      address: '123 Main Street',
      postalCode: '12345',
      city: 'TestCity',
      phone: '0142865750',
      email: 'theater1@test.com',
    });

    // Try to create another with same ID
    await expect(
      MovieTheaterModel.create({
        theaterId: 'duplicate-id',
        name: 'Theater 2',
        address: '456 Oak Avenue',
        postalCode: '67890',
        city: 'OtherCity',
        phone: '0987654321',
        email: 'theater2@test.com',
      })
    ).rejects.toThrow();
  });

  it('should validate name length constraints', async () => {
    // Empty name
    await expect(
      MovieTheaterModel.create({
        theaterId: 'test-1',
        name: '',
        address: '123 Main Street',
        postalCode: '12345',
        city: 'TestCity',
        phone: '0142865750',
        email: 'test@theater.com',
      })
    ).rejects.toThrow();

    // Name too long (> 255 characters)
    await expect(
      MovieTheaterModel.create({
        theaterId: 'test-2',
        name: 'A'.repeat(256),
        address: '123 Main Street',
        postalCode: '12345',
        city: 'TestCity',
        phone: '0142865750',
        email: 'test@theater.com',
      })
    ).rejects.toThrow();
  });

  it('should validate address length constraints', async () => {
    // Too short (< 5 characters)
    await expect(
      MovieTheaterModel.create({
        theaterId: 'test-1',
        name: 'Test Theater',
        address: '123',
        postalCode: '12345',
        city: 'TestCity',
        phone: '0142865750',
        email: 'test@theater.com',
      })
    ).rejects.toThrow();

    // Too long (> 100 characters)
    await expect(
      MovieTheaterModel.create({
        theaterId: 'test-2',
        name: 'Test Theater',
        address: 'A'.repeat(101),
        postalCode: '12345',
        city: 'TestCity',
        phone: '0142865750',
        email: 'test@theater.com',
      })
    ).rejects.toThrow();

    // Valid length
    const theater = await MovieTheaterModel.create({
      theaterId: 'test-3',
      name: 'Test Theater',
      address: '12345',
      postalCode: '12345',
      city: 'TestCity',
      phone: '0142865750',
      email: 'test@theater.com',
    });
    expect(theater.address).toBe('12345');
  });

  it('should validate postalCode format', async () => {
    // Too short (< 4 digits)
    await expect(
      MovieTheaterModel.create({
        theaterId: 'test-1',
        name: 'Test Theater',
        address: '123 Main Street',
        postalCode: '123',
        city: 'TestCity',
        phone: '0142865750',
        email: 'test@theater.com',
      })
    ).rejects.toThrow();

    // Too long (> 10 digits)
    await expect(
      MovieTheaterModel.create({
        theaterId: 'test-2',
        name: 'Test Theater',
        address: '123 Main Street',
        postalCode: '12345678901',
        city: 'TestCity',
        phone: '0142865750',
        email: 'test@theater.com',
      })
    ).rejects.toThrow();

    // Non-numeric characters
    await expect(
      MovieTheaterModel.create({
        theaterId: 'test-3',
        name: 'Test Theater',
        address: '123 Main Street',
        postalCode: '1234A',
        city: 'TestCity',
        phone: '0142865750',
        email: 'test@theater.com',
      })
    ).rejects.toThrow();

    // Valid postal codes
    const validCodes = ['1234', '12345', '1234567890'];

    for (const code of validCodes) {
      const theater = await MovieTheaterModel.create({
        theaterId: `test-${code}`,
        name: 'Test Theater',
        address: '123 Main Street',
        postalCode: code,
        city: 'TestCity',
        phone: '0142865750',
        email: 'test@theater.com',
      });
      expect(theater.postalCode).toBe(code);
      await theater.destroy();
    }
  });

  it('should validate city name constraints', async () => {
    // Too short (< 2 characters)
    await expect(
      MovieTheaterModel.create({
        theaterId: 'test-1',
        name: 'Test Theater',
        address: '123 Main Street',
        postalCode: '12345',
        city: 'A',
        phone: '0142865750',
        email: 'test@theater.com',
      })
    ).rejects.toThrow();

    // Too long (> 50 characters)
    await expect(
      MovieTheaterModel.create({
        theaterId: 'test-2',
        name: 'Test Theater',
        address: '123 Main Street',
        postalCode: '12345',
        city: 'A'.repeat(51),
        phone: '0142865750',
        email: 'test@theater.com',
      })
    ).rejects.toThrow();
  });

  it('should support international city names', async () => {
    const internationalCities = [
      'Paris',
      'Saint-Étienne',
      'Aix-en-Provence',
      'São Paulo',
      'Zürich',
      "L'Aquila",
    ];

    for (const city of internationalCities) {
      const theater = await MovieTheaterModel.create({
        theaterId: `theater-${city.replace(/[^a-zA-Z0-9]/g, '')}`,
        name: 'Test Theater',
        address: '123 Main Street',
        postalCode: '12345',
        city: city,
        phone: '0142865750',
        email: 'test@theater.com',
      });
      expect(theater.city).toBe(city);
      await theater.destroy();
    }
  });

  it('should validate phone number format', async () => {
    // Too short (< 6 characters)
    await expect(
      MovieTheaterModel.create({
        theaterId: 'test-1',
        name: 'Test Theater',
        address: '123 Main Street',
        postalCode: '12345',
        city: 'TestCity',
        phone: '12345',
        email: 'test@theater.com',
      })
    ).rejects.toThrow();

    // Too long (> 20 characters)
    await expect(
      MovieTheaterModel.create({
        theaterId: 'test-2',
        name: 'Test Theater',
        address: '123 Main Street',
        postalCode: '12345',
        city: 'TestCity',
        phone: '123456789012345678901',
        email: 'test@theater.com',
      })
    ).rejects.toThrow();

    // Valid phone formats
    const validPhones = [
      '+33 1 42 86 57 50',
      '01 42 86 57 50',
      '+1-555-123-4567',
      '0142865750',
      '+1 555 123 4567',
    ];

    for (const phone of validPhones) {
      const theater = await MovieTheaterModel.create({
        theaterId: `test-${validPhones.indexOf(phone)}`,
        name: 'Test Theater',
        address: '123 Main Street',
        postalCode: '12345',
        city: 'TestCity',
        phone: phone,
        email: 'test@theater.com',
      });
      expect(theater.phone).toBe(phone);
      await theater.destroy();
    }
  });

  it('should validate email format', async () => {
    // Invalid email format
    await expect(
      MovieTheaterModel.create({
        theaterId: 'test-1',
        name: 'Test Theater',
        address: '123 Main Street',
        postalCode: '12345',
        city: 'TestCity',
        phone: '0142865750',
        email: 'invalid-email',
      })
    ).rejects.toThrow();

    // Valid email
    const theater = await MovieTheaterModel.create({
      theaterId: 'test-2',
      name: 'Test Theater',
      address: '123 Main Street',
      postalCode: '12345',
      city: 'TestCity',
      phone: '0142865750',
      email: 'valid@theater.com',
    });
    expect(theater.email).toBe('valid@theater.com');
  });

  it('should have halls association defined', () => {
    const associations = MovieTheaterModel.associations;
    expect(associations.halls).toBeDefined();
    expect(associations.halls.associationType).toBe('HasMany');
  });

  it('should have screenings association defined', () => {
    const associations = MovieTheaterModel.associations;
    expect(associations.screenings).toBeDefined();
    expect(associations.screenings.associationType).toBe('HasMany');
  });

  it('should load theater with halls association', async () => {
    const theater = await MovieTheaterModel.create({
      theaterId: 'test-theater-1',
      name: 'Test Cinema',
      address: '123 Test Street',
      postalCode: '12345',
      city: 'TestCity',
      phone: '0142865750',
      email: 'test@theater.com',
    });

    // Create halls for the theater
    await MovieHallModel.create({
      theaterId: theater.theaterId,
      hallId: 'hall-1',
      seatsLayout: [['A1', 'A2']],
      quality: '2D',
    });

    await MovieHallModel.create({
      theaterId: theater.theaterId,
      hallId: 'hall-2',
      seatsLayout: [['B1', 'B2', 'B3']],
      quality: 'IMAX',
    });

    // Load theater with halls
    const theaterWithHalls = await MovieTheaterModel.findByPk(
      theater.theaterId,
      {
        include: [{ model: MovieHallModel, as: 'halls' }],
      }
    );

    expect(theaterWithHalls).toBeDefined();
    expect(theaterWithHalls!.halls).toBeDefined();
    expect(theaterWithHalls!.halls).toHaveLength(2);
    expect(theaterWithHalls!.halls.map((h) => h.hallId).sort()).toEqual([
      'hall-1',
      'hall-2',
    ]);
  });

  it('should load theater with screenings association', async () => {
    const theater = await MovieTheaterModel.create({
      theaterId: 'test-theater-2',
      name: 'Test Cinema',
      address: '123 Test Street',
      postalCode: '12345',
      city: 'TestCity',
      phone: '0142865750',
      email: 'test@theater.com',
    });

    await MovieHallModel.create({
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
      hallId: 'hall-1',
      startTime: new Date('2025-12-01T19:00:00'),
      price: 12.5,
    });

    await ScreeningModel.create({
      movieId: movie.movieId,
      theaterId: theater.theaterId,
      hallId: 'hall-1',
      startTime: new Date('2025-12-01T21:00:00'),
      price: 15.0,
    });

    // Load theater with screenings
    const theaterWithScreenings = await MovieTheaterModel.findByPk(
      theater.theaterId,
      {
        include: [{ model: ScreeningModel, as: 'screenings' }],
      }
    );

    expect(theaterWithScreenings).toBeDefined();
    expect(theaterWithScreenings!.screenings).toBeDefined();
    expect(theaterWithScreenings!.screenings).toHaveLength(2);
  });

  it('should update theater information', async () => {
    const theater = await MovieTheaterModel.create({
      theaterId: 'test-theater-3',
      name: 'Original Name',
      address: '123 Original Street',
      postalCode: '12345',
      city: 'OriginalCity',
      phone: '0142865750',
      email: 'original@theater.com',
    });

    await theater.update({
      name: 'Updated Name',
      phone: '+1-555-999-8888',
      email: 'updated@theater.com',
    });

    expect(theater.name).toBe('Updated Name');
    expect(theater.phone).toBe('+1-555-999-8888');
    expect(theater.email).toBe('updated@theater.com');
    expect(theater.address).toBe('123 Original Street'); // unchanged

    // Verify in database
    const updated = await MovieTheaterModel.findByPk(theater.theaterId);
    expect(updated!.name).toBe('Updated Name');
    expect(updated!.phone).toBe('+1-555-999-8888');
  });

  it('should find theaters by city', async () => {
    await MovieTheaterModel.create({
      theaterId: 'paris-1',
      name: 'Paris Cinema 1',
      address: '123 Street',
      postalCode: '75001',
      city: 'Paris',
      phone: '0142865750',
      email: 'paris1@theater.com',
    });

    await MovieTheaterModel.create({
      theaterId: 'paris-2',
      name: 'Paris Cinema 2',
      address: '456 Avenue',
      postalCode: '75002',
      city: 'Paris',
      phone: '0987654321',
      email: 'paris2@theater.com',
    });

    await MovieTheaterModel.create({
      theaterId: 'lyon-1',
      name: 'Lyon Cinema',
      address: '789 Boulevard',
      postalCode: '69001',
      city: 'Lyon',
      phone: '0555555555',
      email: 'lyon@theater.com',
    });

    const parisTheaters = await MovieTheaterModel.findAll({
      where: { city: 'Paris' },
    });

    expect(parisTheaters).toHaveLength(2);
    expect(parisTheaters.every((t) => t.city === 'Paris')).toBe(true);
  });

  it('should handle timestamps correctly', async () => {
    const beforeCreate = new Date();

    const theater = await MovieTheaterModel.create({
      theaterId: 'test-timestamps',
      name: 'Test Theater',
      address: '123 Test Street',
      postalCode: '12345',
      city: 'TestCity',
      phone: '0142865750',
      email: 'test@theater.com',
    });

    const afterCreate = new Date();

    expect(theater.createdAt.getTime()).toBeGreaterThanOrEqual(
      beforeCreate.getTime()
    );
    expect(theater.createdAt.getTime()).toBeLessThanOrEqual(
      afterCreate.getTime()
    );
    expect(theater.updatedAt.getTime()).toBeGreaterThanOrEqual(
      beforeCreate.getTime()
    );
    expect(theater.updatedAt.getTime()).toBeLessThanOrEqual(
      afterCreate.getTime()
    );
  });
});
