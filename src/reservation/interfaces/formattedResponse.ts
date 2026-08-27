import { ReservationStatus } from '../entities/reservation.entity';

export interface FormattedResponse {
  startTime: string;
  endTime: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  spot: {
    id: string;
    code: string;
  };
  id: string;
  vehiclePlate: string;
  date: Date;
  startMinute: number;
  endMinute: number;
  status: ReservationStatus;
  createdAt: Date;
}
