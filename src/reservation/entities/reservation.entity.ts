import { ParkingSpot } from 'src/parking-spot/entities/parking-spot.entity';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum ReservationStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
}
@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  vehiclePlate: string;

  @Column({ type: 'date' })
  date: Date;

  @Column()
  startMinute: number;

  @Column()
  endMinute: number;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.ACTIVE,
  })
  status: ReservationStatus;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @ManyToOne(() => ParkingSpot, { eager: false })
  spot: ParkingSpot;

  @CreateDateColumn()
  createdAt: Date;
}
