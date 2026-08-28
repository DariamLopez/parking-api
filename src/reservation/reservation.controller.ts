import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/common';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { ReservationPaginationDto } from './dto/reservation-pagination.dto';

@Controller('reservation')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  @Auth(ValidRoles.client)
  create(
    @Body() createReservationDto: CreateReservationDto,
    @GetUser() user: User,
  ) {
    return this.reservationService.create(createReservationDto, user);
  }

  @Patch('arrived/:id')
  @Auth(ValidRoles.admin, ValidRoles.employee)
  arrived(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.reservationService.arrived(id, user);
  }

  @Patch('done/:id')
  @Auth(ValidRoles.admin, ValidRoles.employee)
  done(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.reservationService.done(id, user);
  }

  @Get()
  @Auth()
  findAll(
    @Query() paginationDto: ReservationPaginationDto,
    @GetUser() user: User,
  ) {
    return this.reservationService.findAll(paginationDto, user);
  }

  @Get(':id')
  @Auth()
  findOne(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    return this.reservationService.findOne(id, user);
  }

  @Delete(':id')
  @Auth(ValidRoles.client, ValidRoles.admin)
  cancel(@Param('id', ParseUUIDPipe) id: string, @GetUser() user: User) {
    // return this.reservationService.defragment(id);
    return this.reservationService.cancel(id, user);
  }
}
