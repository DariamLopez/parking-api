import { Controller, Get, Body, Query } from '@nestjs/common';
import { LogsService } from './logs.service';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/common';
import { LogQueryDto } from './dto/log-query.dto';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @Auth(ValidRoles.admin)
  findAll(@Query() query: LogQueryDto) {
    return this.logsService.findAll(query);
  }
}
