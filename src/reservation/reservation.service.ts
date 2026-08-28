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
} from 'src/common/utils/time.utils';
import { ParkingSpot } from 'src/parking-spot/entities/parking-spot.entity';
import { ReservationPaginationDto } from './dto/reservation-pagination.dto';
import { ValidRoles } from 'src/common';
import { ConfigService } from '@nestjs/config';
import {
  formatReservation,
  validateArrivedWindows,
  validateCancelWindows,
  validationTimeRange,
} from './utils/reservation.utils';
import { type CreateResponse } from './interfaces/createResponse.interface';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { FormattedResponse } from './interfaces/formattedResponse';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    private readonly parkingSpotService: ParkingSpotService,
    private readonly configService: ConfigService,
  ) {}
  async create(
    createReservationDto: CreateReservationDto,
    user: User,
  ): Promise<CreateResponse> {
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

    return {
      id: reservation.id,
      vehiclePlate: reservation.vehiclePlate,
      date: createReservationDto.date,
      startTime: createReservationDto.startTime,
      endTime: createReservationDto.endTime,
      status: reservation.status,
      spot: reservation.spot.code,
      createdAt: reservation.createdAt,
    };
  }
  async findAll(
    paginationDto: ReservationPaginationDto,
    user: User,
  ): Promise<PaginatedResponse<FormattedResponse>> {
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
      data: reservations.map((reservation) => formatReservation(reservation)),
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
  async findOne(id: string, user: User): Promise<FormattedResponse> {
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
    return formatReservation(reservation);
  }
  async cancel(
    id: string,
    user: User,
  ): Promise<{ id: string; status: ReservationStatus; message: string }> {
    const reservation = await this.reservationRepo.findOne({
      where: { id },
      relations: { user: true, spot: true },
    });
    if (!reservation)
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    if (
      reservation.status === ReservationStatus.CANCELLED ||
      reservation.status === ReservationStatus.DONE
    )
      throw new BadRequestException(
        `Reservations with status ${reservation.status} can't be cancelled`,
      );
    const isAdmin = user.roles.includes(ValidRoles.admin);
    if (!isAdmin && reservation.user.id !== user.id) {
      throw new ForbiddenException(
        `You do not have permission to cancel this reservation`,
      );
    }

    validateCancelWindows(reservation);

    reservation.status = ReservationStatus.CANCELLED;
    await this.reservationRepo.save(reservation);

    this.logger.log(
      `Reservation with ID ${id} has been cancelled by ${user.id}`,
    );
    return {
      id: reservation.id,
      status: reservation.status,
      message: 'Reservation cancelled successfully',
    };
  }
  async arrived(id: string, user: User) {
    const reservation = await this.reservationRepo.findOne({
      where: { id },
      relations: { user: true, spot: true },
    });
    if (!reservation) {
      throw new NotFoundException(`Reservation with Id ${id} not found`);
    }
    if (reservation.status !== ReservationStatus.ACTIVE)
      throw new BadRequestException(
        `The reservations with status ${reservation.status} can't be marked as arrived`,
      );
    validateArrivedWindows(reservation);
    reservation.status = ReservationStatus.ARRIVED;
    await this.reservationRepo.save(reservation);

    this.logger.log(
      `Reservation with ID ${id} has been marked as arrived by ${user.id}`,
    );
    return {
      id: reservation.id,
      status: reservation.status,
      message: 'Reservation marked as arrived successfully',
    };
  }
  async done(id: string, user: User) {
    const reservation = await this.reservationRepo.findOne({
      where: { id },
      relations: { user: true, spot: true },
    });
    if (!reservation) {
      throw new NotFoundException(`Reservation with Id ${id} not found`);
    }
    if (reservation.status !== ReservationStatus.ARRIVED)
      throw new BadRequestException(
        `The reservations with status ${reservation.status} can't be marked as done`,
      );
    reservation.status = ReservationStatus.DONE;
    await this.reservationRepo.save(reservation);

    this.logger.log(
      `Reservation with ID ${id} has been marked as done by ${user.id}`,
    );
    return {
      id: reservation.id,
      status: reservation.status,
      message: 'Reservation marked as done successfully',
    };
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
  /* private async defragment(cancelled: Reservation): Promise<void> {
    const { today, currentMinute } = getCurrentDayAndMinute();
    // reservations starting within 60 min are locked — spot already communicated
    const lockMinute = currentMinute + 60;

    const isToday = isSameDay(new Date(cancelled.date), today);

    // last active reservation on the same spot that ends at or before the freed slot starts
    const beforeAdjacent = await this.reservationRepo
      .createQueryBuilder('r')
      .where('r.spotId = :spotId', { spotId: cancelled.spot.id })
      .andWhere('r.status = :status', { status: ReservationStatus.ACTIVE })
      .andWhere('DATE(r.date) = DATE(:date)', { date: cancelled.date })
      .andWhere('r.endMinute <= :cancelledStart', {
        cancelledStart: cancelled.startMinute,
      })
      .orderBy('r.endMinute', 'DESC')
      .limit(1)
      .getOne();

    // first active reservation on the same spot that starts at or after the freed slot ends
    const afterAdjacent = await this.reservationRepo
      .createQueryBuilder('r')
      .where('r.spotId = :spotId', { spotId: cancelled.spot.id })
      .andWhere('r.status = :status', { status: ReservationStatus.ACTIVE })
      .andWhere('DATE(r.date) = DATE(:date)', { date: cancelled.date })
      .andWhere('r.startMinute >= :cancelledEnd', {
        cancelledEnd: cancelled.endMinute,
      })
      .orderBy('r.startMinute', 'ASC')
      .limit(1)
      .getOne();

    // real contiguous free window is wider than just the cancelled reservation
    const freeStart = beforeAdjacent?.endMinute ?? cancelled.startMinute;
    const freeEnd = afterAdjacent?.startMinute ?? cancelled.endMinute;
    const candidates = await this.reservationRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.spot', 'spot')
      .where('spot.id != :spotId', { spotId: cancelled.spot.id })
      .andWhere(
        'CAST(SUBSTRING(spot.code FROM 2) AS INTEGER) > CAST(SUBSTRING(:code FROM 2) AS INTEGER)',
        { code: cancelled.spot.code },
      )
      .andWhere('r.status = :status', { status: ReservationStatus.ACTIVE })
      .andWhere('DATE(r.date) = DATE(:date)', { date: cancelled.date })
      .andWhere('r.startMinute >= :freeStart', { freeStart })
      .andWhere('r.endMinute <= :freeEnd', { freeEnd })
      .andWhere('r.startMinute > :lockMinute', {
        lockMinute: isToday ? lockMinute : 0,
      })
      // // highest code first: empty least-priority spots before lower-numbered ones
      .orderBy('CAST(SUBSTRING(spot.code FROM 2) AS INTEGER)', 'ASC')
      .getMany();

    if (candidates.length === 0) return;

    for (const candidate of candidates) {
      const conflicts = await this.reservationRepo
        .createQueryBuilder('r')
        .where('r.spotId = :spotId', { spotId: cancelled.spot.id })
        .andWhere('r.status = :status', { status: ReservationStatus.ACTIVE })
        .andWhere('DATE(r.date) = DATE(:date)', { date: cancelled.date })
        .andWhere('r.startMinute < :endMinute', {
          endMinute: candidate.endMinute,
        })
        .andWhere('r.endMinute > :startMinute', {
          startMinute: candidate.startMinute,
        })
        .getCount();

      if (conflicts === 0) {
        const previousCode = candidate.spot.code;
        candidate.spot = cancelled.spot;
        await this.reservationRepo.save(candidate);
        this.logger.log(
          `Defrag: reservation ${candidate.id} moved from ${previousCode} to ${cancelled.spot.code}`,
        );
        break;
      }
    }
  } */
}
