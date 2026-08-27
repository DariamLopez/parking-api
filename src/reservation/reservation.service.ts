import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { User } from 'src/users/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { Repository } from 'typeorm';
import { ParkingSpotService } from 'src/parking-spot/parking-spot.service';
import {
  getCurrentDayAndMinute,
  isSameDay,
  minutesToTime,
  PARKING_CLOSE_MINUTE,
  PARKING_OPEN_MINUTE,
  parseDateStr,
  parseToMinutes,
} from './utils/time.utils';
import { ParkingSpot } from 'src/parking-spot/entities/parking-spot.entity';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    private readonly parkingSpotService: ParkingSpotService,
  ) {}
  async create(createReservationDto: CreateReservationDto, user: User) {
    const date = parseDateStr(createReservationDto.date);
    const startMinute = parseToMinutes(createReservationDto.startTime);
    const endMinute = parseToMinutes(createReservationDto.endTime);

    this.validationTimeRange(date, startMinute, endMinute);

    const availableSpot = await this.findAvailableSpot(
      date,
      startMinute,
      endMinute,
    );
    if (!availableSpot)
      throw new ConflictException(
        'No available parking spots for the requested time range',
      );

    const reservation = this.reservationRepo.create({
      user,
      spot: availableSpot,
      vehiclePlate: createReservationDto.vehiclePlate,
      date,
      startMinute,
      endMinute,
      status: ReservationStatus.ACTIVE,
    });
    await this.reservationRepo.save(reservation);
    this.logger.log(
      `Reservation created: ${createReservationDto.vehiclePlate} on ${createReservationDto.date} ` +
        `${createReservationDto.startTime}-${createReservationDto.endTime} by ${user.email}`,
    );

    // spot withheld by design — revealed 60 min before start
    return {
      id: reservation.id,
      vehiclePlate: reservation.vehiclePlate,
      date: createReservationDto.date,
      startTime: createReservationDto.startTime,
      endTime: createReservationDto.endTime,
      status: reservation.status,
      createdAt: reservation.createdAt,
      message:
        'Your parking spot will be communicated 60 minutes before your reservation starts',
    };
  }

  private validationTimeRange(
    date: Date,
    startMinute: number,
    endMinute: number,
  ): void {
    if (endMinute <= startMinute) {
      throw new BadRequestException('End time must be after start time');
    }

    if (startMinute < PARKING_OPEN_MINUTE || endMinute > PARKING_CLOSE_MINUTE)
      throw new BadRequestException(
        `Reservations must be within ${minutesToTime(PARKING_OPEN_MINUTE)} and ${minutesToTime(PARKING_CLOSE_MINUTE)}`,
      );

    const { today, currentMinute } = getCurrentDayAndMinute();
    const isToday = isSameDay(today, date);

    if (date < today)
      throw new BadRequestException('Cannot create a reservation in the past');
    if (isToday && startMinute <= currentMinute)
      throw new BadRequestException('startTime must be in the future');
  }

  private async findAvailableSpot(
    date: Date,
    startMinute: number,
    endMinute: number,
  ): Promise<ParkingSpot | null> {
    const activeSpots = await this.parkingSpotService.findActiveSpots();

    for (const spot of activeSpots) {
      const overlapping = await this.reservationRepo
        .createQueryBuilder('r')
        .where('r.spotId = :spotId', { spotId: spot.id })
        .andWhere('r.status = :status', { status: ReservationStatus.ACTIVE })
        .andWhere('r.date = :date', { date })
        .andWhere('r.startMinute < :endMinute', { endMinute })
        .andWhere('r.endMinute > :startMinute', { startMinute })
        .getCount();

      if (overlapping === 0) {
        return spot;
      }
    }
    return null;
  }
}
