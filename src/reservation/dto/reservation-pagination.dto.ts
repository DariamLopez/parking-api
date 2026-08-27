import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { ReservationStatus } from '../entities/reservation.entity';

export class ReservationPaginationDto extends PaginationDto {
  @IsString()
  @IsOptional()
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, { message: 'date must be dd/mm/yyyy' })
  date?: string;

  @IsString()
  @IsOptional()
  vehiclePlate?: string;

  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;
}
