import {
  Column,
  DataType,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';

export interface MovieTheaterAttributes {
  theaterId: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
}

@Table({ tableName: 'movie_theater', timestamps: true })
export class MovieTheaterModel
  extends Model<MovieTheaterAttributes>
  implements MovieTheaterAttributes
{
  @PrimaryKey
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: {
        args: [2, 36],
        msg: 'theaterId must be between 2 and 36 characters',
      },
      is: {
        args: /^[a-zA-Z0-9_-]+$/,
        msg: 'theaterId must contain only letters, numbers, underscores or hyphens',
      },
    },
  })
  declare theaterId: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [5, 100],
        msg: 'Address must be between 5 and 100 characters',
      },
    },
  })
  declare address: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      is: {
        args: /^[0-9]{4,10}$/,
        msg: 'Postal code must be 4 to 10 digits',
      },
    },
  })
  declare postalCode: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      len: {
        args: [2, 50],
        msg: 'City name must be between 2 and 50 characters',
      },
      is: {
        args: /^[a-zA-ZÀ-ÖØ-öø-ÿ' -]+$/u,
        msg: 'City name can only contain letters, spaces, hyphens, and apostrophes',
      },
    },
  })
  declare city: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      is: {
        // French/European and international formats, adjust as needed
        args: /^(\+?\d{1,3})?[-. ]?(\d{2,4}[-. ]?){2,5}\d{2,4}$/,
        msg: 'Phone number format is invalid',
      },
      len: {
        args: [6, 20],
        msg: 'Phone number must be between 6 and 20 digits',
      },
    },
  })
  declare phone: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    validate: {
      isEmail: {
        msg: 'Email must be valid',
      },
    },
  })
  declare email: string;

  // These are provided automatically by Sequelize with `timestamps: true`
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}
