import {
  Table,
  Model,
  Column,
  DataType,
  ForeignKey,
  BelongsTo,
  PrimaryKey,
  Default,
  Index,
} from 'sequelize-typescript';
import { MovieTheaterModel } from './movie-theater.model.js';
import { MovieHallModel } from './movie-hall.model.js';
import { UserModel } from './user.model.js';

export interface IncidentReportAttributes {
  incidentId?: string;
  theaterId: string;
  hallId: string;
  title: string;
  description: string;
  status?: 'pending' | 'in_progress' | 'fulfilled';
  date?: Date;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Table({
  tableName: 'incident_reports',
  timestamps: true,
})
export class IncidentReportModel
  extends Model<IncidentReportAttributes>
  implements IncidentReportAttributes
{
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare incidentId: string;

  @ForeignKey(() => MovieTheaterModel)
  @Column({
    allowNull: false,
  })
  declare theaterId: string;

  @ForeignKey(() => MovieHallModel)
  @Column({
    allowNull: false,
  })
  declare hallId: string;

  @Column({
    allowNull: false,
    validate: {
      len: [3, 255],
      is: /^[^<>]+$/,
      notEmpty: true,
    },
  })
  declare title: string;

  @Column({
    allowNull: false,
    validate: {
      len: [5, 2000],
      notEmpty: true,
      is: /^[^<>]*$/,
    },
  })
  declare description: string;

  @Column({
    allowNull: false,
    defaultValue: 'pending',
    validate: {
      isIn: [['pending', 'in_progress', 'fulfilled']],
    },
  })
  declare status: 'pending' | 'in_progress' | 'fulfilled';

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    validate: {
      isNotFutureDate(value: Date) {
        if (value && value > new Date()) {
          throw new Error('Incident date cannot be in the future');
        }
      },
      isReasonableDate(value: Date) {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        if (value && value < oneYearAgo) {
          throw new Error('Incident date cannot be more than one year ago');
        }
      },
    },
  })
  @Column({
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  @Index
  declare date: Date;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID, 
    allowNull: false,
  })
  userId!: string;

  // Relationship definitions
  @BelongsTo(() => MovieTheaterModel, {
    foreignKey: 'theaterId',
    targetKey: 'theaterId',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  declare theater: MovieTheaterModel;

  @BelongsTo(() => MovieHallModel, {
    foreignKey: 'hallId',
    targetKey: 'hallId',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  declare hall: MovieHallModel;

  @BelongsTo(() => UserModel, {
    foreignKey: 'userId',
    targetKey: 'userId',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  declare user: UserModel;
}
