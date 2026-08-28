import { BadRequestException } from '@nestjs/common';
import {
  getCurrentDayAndMinute,
  isSameDay,
  minutesToTime,
  PARKING_CLOSE_MINUTE,
  PARKING_OPEN_MINUTE,
} from 'src/common/utils/time.utils';
import { Reservation } from '../entities/reservation.entity';
import { FormattedResponse } from '../interfaces/formattedResponse';

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

export function formatReservation(reservation: Reservation): FormattedResponse {
  const { spot, user: resUser, ...rest } = reservation;
  return {
    ...rest,
    startTime: minutesToTime(reservation.startMinute),
    endTime: minutesToTime(reservation.endMinute),
    user: {
      id: resUser.id,
      name: resUser.name,
      email: resUser.email,
    },
    spot: {
      id: spot.id,
      code: spot.code,
    },
  };
}
export function validateCancelWindows(reservation: Reservation): void {
  const { today, currentMinute } = getCurrentDayAndMinute();
  const reservationDate = new Date(reservation.date);
  const isToday = isSameDay(reservationDate, today);
  console.log({
    resDate: new Date(reservation.date).getTime(),
    today: today.getTime(),
  });
  if (new Date(reservation.date).getTime() < today.getTime())
    throw new BadRequestException("You can't cancel reservations in the past");
  // cancellation close 120 minutes before the reservation start time
  if (isToday && reservation.startMinute - currentMinute < 120) {
    throw new BadRequestException(
      'Reservations can only be cancelled up to 2 hours before start time',
    );
  }
}
export function validateArrivedWindows(reservation: Reservation): void {
  const { today, currentMinute } = getCurrentDayAndMinute();
  const reservationDate = new Date(reservation.date);
  const isToday = isSameDay(reservationDate, today);
  console.log({
    currentMinute,
    reservationStartMinute: reservation.startMinute,
  });
  if (
    !isToday ||
    reservation.startMinute > currentMinute ||
    reservation.endMinute <= currentMinute
  )
    throw new BadRequestException(
      'Reservations can only be marked as arrived on the same day, after the start time and before the end time',
    );
}
