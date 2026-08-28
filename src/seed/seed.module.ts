import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingSpot } from 'src/parking-spot/entities/parking-spot.entity';
import { User } from 'src/users/entities/user.entity';
import { AuthModule } from 'src/auth/auth.module';
import { LogsModule } from 'src/logs/logs.module';
import { Reservation } from 'src/reservation/entities/reservation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ParkingSpot, Reservation]),
    AuthModule,
    LogsModule,
  ],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
