import { BadRequestException } from '@nestjs/common';
import {
  getCurrentDayAndMinute,
  isSameDay,
  minutesToTime,
  PARKING_CLOSE_MINUTE,
  PARKING_OPEN_MINUTE,
} from './time.utils';
import { Reservation } from '../entities/reservation.entity';
import { User } from 'src/users/entities/user.entity';
import { ValidRoles } from 'src/common/enums/valid-roles.enum';

export function validationTimeRange(
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

export function formatReservation(reservation: Reservation, user: User) {
  const { today, currentMinute } = getCurrentDayAndMinute();
  const isAdminOrEmployee =
    user.roles.includes(ValidRoles.admin) ||
    user.roles.includes(ValidRoles.employee);

  const reservationDate = new Date(reservation.date);
  const isToday = isSameDay(today, reservationDate);

  // spot revealed 60 minutes before start
  const spotVisible =
    isAdminOrEmployee ||
    (isToday && reservation.startMinute - currentMinute <= 60);

  const { spot, user: resUser, ...rest } = reservation;
  return {
    ...rest,
    startMinute: minutesToTime(reservation.startMinute),
    endMinute: minutesToTime(reservation.endMinute),
    user: { id: resUser.id, name: resUser.name, email: resUser.email },
    ...(spotVisible && spot ? { spot: { id: spot.id, code: spot.code } } : {}),
  };
}
