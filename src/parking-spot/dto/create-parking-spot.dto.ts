import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class CreateParkingSpotDto {
  @IsString()
  @Matches(/^P\d{3}$/, { message: 'Code must follow format P001, P002...' })
  code!: string;

  @IsBoolean()
  @IsOptional()
  isActive!: boolean;
}
