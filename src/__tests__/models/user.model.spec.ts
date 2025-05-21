import { Sequelize } from 'sequelize-typescript';
import bcrypt from 'bcrypt';
import { UserModel } from '../../models/user.model';

describe('UserModel', () => {
  let sequelize: Sequelize;

  beforeAll(async () => {
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
      models: [UserModel],
    });

    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('creates a valid user, sets verified to false, hashes the password, and normalizes email', async () => {
    const user = await UserModel.create({
      username: 'testuser',
      firstName: 'John',
      lastName: 'Doe',
      email: 'John.DOE@Example.com',
      password: 'secret123',
    });

    expect(user.userId).toBeDefined();
    expect(user.username).toBe('testuser');
    expect(user.firstName).toBe('John');
    expect(user.lastName).toBe('Doe');
    expect(user.email).toBe('john.doe@example.com'); // normalized
    expect(user.verified).toBe(false);
    expect(user.password).not.toBe('secret123');
    expect(await bcrypt.compare('secret123', user.password)).toBe(true);
  });

  it('can set verified to true', async () => {
    const user = await UserModel.create({
      username: 'verifieduser',
      firstName: 'Vera',
      lastName: 'Fied',
      email: 'vera@example.com',
      password: 'verapass',
      verified: true,
    });

    expect(user.verified).toBe(true);
  });

  it('fails validation for invalid username', async () => {
    await expect(
      UserModel.create({
        username: 'in*valid', // invalid char
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        password: 'password123',
      })
    ).rejects.toThrow(/Username can only contain letters and numbers/);
  });

  it('fails validation for short first name', async () => {
    await expect(
      UserModel.create({
        username: 'user2',
        firstName: 'A', // too short
        lastName: 'Smith',
        email: 'alice2@example.com',
        password: 'password123',
      })
    ).rejects.toThrow(/First name must be between 2 and 30 characters/);
  });

  it('fails validation for invalid last name', async () => {
    await expect(
      UserModel.create({
        username: 'user3',
        firstName: 'Alice',
        lastName: 'Sm!th', // invalid char
        email: 'alice3@example.com',
        password: 'password123',
      })
    ).rejects.toThrow(
      /Last name can only contain letters, spaces, hyphens, and apostrophes/
    );
  });

  it('fails validation for invalid email', async () => {
    await expect(
      UserModel.create({
        username: 'user4',
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'notanemail',
        password: 'password123',
      })
    ).rejects.toThrow(/Email must be valid/);
  });

  it('validatePassword returns true for correct password and false for wrong', async () => {
    const user = await UserModel.create({
      username: 'user5',
      firstName: 'Carl',
      lastName: 'Davis',
      email: 'carl@example.com',
      password: 'password456',
    });

    expect(await user.validatePassword('password456')).toBe(true);
    expect(await user.validatePassword('wrongpassword')).toBe(false);
  });

  it('updates and hashes password on update', async () => {
    const user = await UserModel.create({
      username: 'user6',
      firstName: 'Dana',
      lastName: 'Miller',
      email: 'dana@example.com',
      password: 'startpass',
    });

    const oldHash = user.password;
    user.password = 'newpass123';
    await user.save();

    expect(user.password).not.toBe(oldHash);
    expect(await user.validatePassword('newpass123')).toBe(true);
    expect(await user.validatePassword('startpass')).toBe(false);
  });

  it('normalizes email on update', async () => {
    const user = await UserModel.create({
      username: 'user7',
      firstName: 'Eve',
      lastName: 'Levine',
      email: 'EVE@GMAIL.COM',
      password: 'somepass',
    });
    user.email = 'MiXeD@Case.CoM';
    await user.save();
    expect(user.email).toBe('mixed@case.com');
  });

  it('does not expose password in toJSON', async () => {
    const user = await UserModel.create({
      username: 'user8',
      firstName: 'NoPass',
      lastName: 'Exposed',
      email: 'no.pass@example.com',
      password: 'notplaintext',
    });

    const json = user.toJSON();
    expect(json.password).toBeUndefined();
    expect(json.username).toBe('user8');
    expect(json.email).toBe('no.pass@example.com');
  });

  it('fails with duplicate username', async () => {
    await UserModel.create({
      username: 'uniqueuser',
      firstName: 'Uno',
      lastName: 'User',
      email: 'unique1@example.com',
      password: 'pass',
    });

    await expect(
      UserModel.create({
        username: 'uniqueuser', // duplicate
        firstName: 'Dos',
        lastName: 'User',
        email: 'unique2@example.com',
        password: 'pass',
      })
    ).rejects.toThrow(/Validation error/i);
  });

  it('fails with duplicate email (case-insensitive)', async () => {
    await UserModel.create({
      username: 'emailunique1',
      firstName: 'Email',
      lastName: 'User',
      email: 'case@duplicate.com',
      password: 'pass',
    });

    await expect(
      UserModel.create({
        username: 'emailunique2',
        firstName: 'Another',
        lastName: 'User',
        email: 'Case@Duplicate.com', // case-insensitive duplicate
        password: 'pass',
      })
    ).rejects.toThrow(/Validation error/i);
  });

  it('accepts names with accents, hyphens, apostrophes, and spaces', async () => {
    const user = await UserModel.create({
      username: 'accented',
      firstName: 'Jean-Luc',
      lastName: "O'Connéry",
      email: 'accented@example.com',
      password: 'pass',
    });

    expect(user.firstName).toBe('Jean-Luc');
    expect(user.lastName).toBe("O'Connéry");
  });
});
