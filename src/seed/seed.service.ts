import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { ParkingSpot } from 'src/parking-spot/entities/parking-spot.entity';
import { ValidRoles } from 'src/common';
import * as bcrypt from 'bcryptjs';
import { LogsService } from 'src/logs/logs.service';
import { LogType } from 'src/logs/shemas/activity-log.shema';
import { Reservation } from 'src/reservation/entities/reservation.entity';

const SEED_USERS = [
  {
    name: 'Admin User',
    email: 'admin@parking.com',
    password: 'Admin1234!',
    roles: [ValidRoles.admin],
  },
  {
    name: 'Employee User',
    email: 'employee@parking.com',
    password: 'Admin1234!',
    roles: [ValidRoles.employee],
  },
  {
    name: 'Client User',
    email: 'client@parking.com',
    password: 'Admin1234!',
    roles: [ValidRoles.client],
  },
];

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ParkingSpot)
    private readonly spotRepository: Repository<ParkingSpot>,
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    private readonly loggerService: LogsService,
  ) {}

  async runSeed(user: User) {
    await this.loggerService.log(LogType.SEED_EXECUTED, user.id, {
      message: 'Seed executed successfully',
    });
    await this.deleteTables();
    await this.seedUsers();
    await this.seedParkingSpots();
    return { message: 'Seed executed successfully' };
  }

  private async deleteTables() {
    await this.reservationRepository.createQueryBuilder().delete().execute();
    await this.spotRepository.createQueryBuilder().delete().execute();
    await this.userRepository.createQueryBuilder().delete().execute();
    this.logger.log('Tables cleared');
  }

  private async seedUsers() {
    const users = SEED_USERS.map((u) =>
      this.userRepository.create({
        ...u,
        password: bcrypt.hashSync(u.password, 10),
      }),
    );
    await this.userRepository.save(users);
    this.logger.log(`${users.length} users created`);
  }

  private async seedParkingSpots() {
    const spots = Array.from({ length: 20 }, (_, i) => {
      const code = `P${String(i + 1).padStart(3, '0')}`;
      return this.spotRepository.create({ code, isActive: true });
    });
    await this.spotRepository.save(spots);
    this.logger.log(`${spots.length} parking spots created`);
  }
}
