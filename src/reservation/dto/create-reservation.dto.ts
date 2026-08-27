import { IsDateString, IsString, Matches } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  @Matches(/^[A-Z0-9-]{4,8}$/, { message: 'Invalid vehicle plate format' }) //permite cadenas de 4 a 8 caracteres con Numeros del 0 al 9, letras mayusulas y guión
  vehiclePlate!: string;

  @IsString()
  @Matches(/^\d{2}\/\d{2}\/\d{4}$/, { message: 'date must be dd/mm/yyyy' })
  date!: string;

  @IsString()
  @Matches(/^\d{1,2}:\d{2}$/, {
    message: 'startTime must be h:mm or hh:mm (24h)',
  })
  startTime!: string;

  @IsString()
  @Matches(/^\d{1,2}:\d{2}$/, {
    message: 'endTime must be h:mm or hh:mm (24h)',
  })
  endTime!: string;
}
