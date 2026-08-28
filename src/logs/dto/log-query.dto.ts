import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { LogType } from '../shemas/activity-log.shema';

export class LogQueryDto extends PaginationDto {
  @IsEnum(LogType)
  @IsOptional()
  type?: LogType;

  @IsUUID()
  @IsOptional()
  userId?: string;
}
