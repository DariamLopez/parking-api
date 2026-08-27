import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsPositive, MIN, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @IsPositive()
  @Type(() => Number)
  readonly limit?: number;

  @IsOptional()
  @Min(0)
  @Type(() => Number)
  readonly offset?: number;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'Order must be either ASC or DESC' })
  readonly order?: 'ASC' | 'DESC';
}
