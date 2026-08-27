import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
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
  parseDateStr,
  parseToMinutes,
} from './utils/time.utils';
import { ParkingSpot } from 'src/parking-spot/entities/parking-spot.entity';
import { ReservationPaginationDto } from './dto/reservation-pagination.dto';
import { ValidRoles } from 'src/common';
import { ConfigService } from '@nestjs/config';
import {
  formatReservation,
  validationTimeRange,
} from './utils/reservation.utils';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    private readonly parkingSpotService: ParkingSpotService,
    private readonly configService: ConfigService,
  ) {}
  async create(createReservationDto: CreateReservationDto, user: User) {
    const date = parseDateStr(createReservationDto.date);
    const startMinute = parseToMinutes(createReservationDto.startTime);
    const endMinute = parseToMinutes(createReservationDto.endTime);

    validationTimeRange(date, startMinute, endMinute);

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
  async findAll(paginationDto: ReservationPaginationDto, user: User) {
    const query = this.reservationRepo.createQueryBuilder('r');
    const {
      date = undefined,
      status = undefined,
      vehiclePlate = undefined,
      order = 'ASC',
      offset = 0,
      limit = 10,
    } = paginationDto;
    const isClient = user.roles.includes(ValidRoles.client);
    query.leftJoinAndSelect('r.user', 'user');
    query.leftJoinAndSelect('r.spot', 'spot');

    if (isClient) {
      query.andWhere('r.userId = :userId', { userId: user.id });
    }
    if (date) {
      query.andWhere('DATE(r.date) = DATE(:date)', {
        date: parseDateStr(date),
      });
    }
    if (status !== undefined) {
      query.andWhere('r.status = :status', { status });
    }
    if (vehiclePlate) {
      query.andWhere('r.vehiclePlate LIKE :vehiclePlate', {
        vehiclePlate: `%${vehiclePlate}%`,
      });
    }

    query.orderBy('r.date', order === 'ASC' ? 'ASC' : 'DESC');
    query.skip(offset);
    query.take(limit);
    const reservations = await query.getMany();
    const total = await query.getCount();
    const baseUrl =
      this.configService.get<string>('API_HOST') +
      ':' +
      this.configService.get<string>('PORT') +
      '/api';
    return {
      data: reservations.map((reservation) =>
        formatReservation(reservation, user),
      ),
      pagination: {
        limit,
        offset,
        total,
        page: Math.ceil(offset / limit) + 1,
      },
      links: {
        ...(offset > 0
          ? {
              prev: `${baseUrl}/reservation?limit=${limit}&offset=${Math.max(offset - limit, 0)}${order ? `&order=${order}` : ''}${status !== undefined ? `&status=${status}` : ''}${vehiclePlate ? `&vehiclePlate=${vehiclePlate}` : ''}`,
            }
          : {}),
        ...(offset + limit < total
          ? {
              next: `${baseUrl}/reservation?limit=${limit}&offset=${offset + limit}${order ? `&order=${order}` : ''}${status !== undefined ? `&status=${status}` : ''}${vehiclePlate ? `&vehiclePlate=${vehiclePlate}` : ''}`,
            }
          : {}),
      },
    };
  }
  async findOne(id: string, user: User) {
    const reservation = await this.reservationRepo.findOne({
      where: { id },
      relations: { user: true, spot: true },
    });
    if (!reservation)
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    const isOwner = reservation.user.id === user.id;
    const isAdminOrEmployee =
      user.roles.includes(ValidRoles.admin) ||
      user.roles.includes(ValidRoles.employee);
    if (!isOwner && !isAdminOrEmployee) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }
    return formatReservation(reservation, user);
  }
  async cancel(id: string, user: User) {
    const reservation = await this.reservationRepo.findOne({
      where: { id },
      relations: { user: true, spot: true },
    });

    if (!reservation)
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    if (reservation.status === ReservationStatus.CANCELLED)
      throw new BadRequestException(
        `Reservation with ID ${id} is already cancelled`,
      );
    const isAdmin = user.roles.includes(ValidRoles.admin);
    if (!isAdmin && reservation.user.id !== user.id) {
      throw new ForbiddenException(
        `You do not have permission to cancel this reservation`,
      );
    }

    this.validateCancelWindows(reservation);

    reservation.status = ReservationStatus.CANCELLED;
    await this.reservationRepo.save(reservation);

    this.logger.log(
      `Reservation with ID ${id} has been cancelled by ${user.id}`,
    );
    // this.defragment(reservation);
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
        .andWhere('DATE(r.date) = :date', { date })
        .andWhere('r.startMinute < :endMinute', { endMinute })
        .andWhere('r.endMinute > :startMinute', { startMinute })
        .getCount();

      if (overlapping === 0) {
        return spot;
      }
    }
    return null;
  }
  private validateCancelWindows(reservation: Reservation) {
    const { today, currentMinute } = getCurrentDayAndMinute();
    const reservationDate = new Date(reservation.date);
    const isToday = isSameDay(reservationDate, today);
    /* console.log({
      isToday,
      diffMinute: reservation.startMinute - currentMinute,
      resMinute: reservation.startMinute,
      currentMinute: currentMinute,
    }); */
    console.log({
      isToday,
      reservationDate,
      today,
    });
    // cancellation close 120 minutes before the reservation start time
    if (isToday && reservation.startMinute - currentMinute < 120) {
      throw new BadRequestException(
        'Reservations can only be cancelled up to 2 hours before start time',
      );
    }
  }
  // private async defragment(cancelled: Reservation) {
  /* async defragment(id: string) {
    const cancelled = await this.reservationRepo.findOne({
      where: { id },
      relations: { spot: true },
    });
    if (!cancelled) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }
    const { today, currentMinute } = getCurrentDayAndMinute();
    const lockMinute = currentMinute + 60; // reservation with 60 minutes or less to start cannot be modified

    // Reserva anterior: la que termina más cercano (o exacto) a cuando empieza la cancelada
    const beforeAdjacent = await this.reservationRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.spot', 'spot')
      .where('r.spotId = :spotId', { spotId: cancelled.spot.id })
      .andWhere('r.status = :status', { status: ReservationStatus.ACTIVE })
      .andWhere('DATE(r.date) = DATE(:date)', { date: cancelled.date })
      .andWhere('r.endMinute <= :cancelledStart', {
        cancelledStart: cancelled.startMinute,
      })
      .orderBy('r.endMinute', 'DESC') // La que termina más tarde (más cercana)
      .limit(1)
      .getOne();

    // Reserva posterior: la que comienza más cercano (o exacto) a cuando termina la cancelada
    const afterAdjacent = await this.reservationRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.spot', 'spot')
      .where('r.spotId = :spotId', { spotId: cancelled.spot.id })
      .andWhere('r.status = :status', { status: ReservationStatus.ACTIVE })
      .andWhere('DATE(r.date) = DATE(:date)', { date: cancelled.date })
      .andWhere('r.startMinute >= :cancelledEnd', {
        cancelledEnd: cancelled.endMinute,
      })
      .orderBy('r.startMinute', 'ASC') // La que comienza más temprano (más cercana)
      .limit(1)
      .getOne();

    const candidates = await this.reservationRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.spot', 'spot')
      .where('spot.id != :spotId', { spotId: cancelled.spot.id })
      .andWhere('spot.code > :code', { code: cancelled.spot.code })
      .andWhere('r.status = :status', { status: ReservationStatus.ACTIVE })
      .andWhere('DATE(r.date) = DATE(:date)', { date: cancelled.date })
      .andWhere('r.startMinute >= :beforeEnd', {
        beforeEnd: beforeAdjacent?.endMinute || cancelled.startMinute,
      })
      .andWhere('r.endMinute <= :afterStart', {
        afterStart: afterAdjacent?.startMinute || cancelled.endMinute,
      })
      .orderBy('spot.code', 'ASC')
      .getMany();
    if (candidates.length === 0) return;
    
    console.log(candidates);
    return candidates;
  } */
}
