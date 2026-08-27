import { ValidRoles } from 'src/common';
import { Reservation } from 'src/reservation/entities/reservation.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column('text', {
    select: false,
  })
  password: string;

  @Column('text', {
    nullable: true,
  })
  phone: string;

  @Column('text', {
    array: true,
    default: [ValidRoles.client],
  })
  roles: string[];

  /* @OneToMany(() => Reservation, (reservation) => reservation.user, {
    eager: true,
  })
  reservations: Reservation[]; */

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
