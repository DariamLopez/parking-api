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
  Put,
  ParseBoolPipe,
} from '@nestjs/common';
import { ParkingSpotService } from './parking-spot.service';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { UpdateParkingSpotDto } from './dto/update-parking-spot.dto';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/common';
import { ParkingPaginationDto } from './dto/parking-pagination.dto';

@Controller('parking-spot')
export class ParkingSpotController {
  constructor(private readonly parkingSpotService: ParkingSpotService) {}

  @Post()
  @Auth(ValidRoles.admin)
  create(@Body() createParkingSpotDto: CreateParkingSpotDto) {
    return this.parkingSpotService.create(createParkingSpotDto);
  }

  @Get()
  @Auth(ValidRoles.admin, ValidRoles.employee)
  findAll(@Query() paginationDto: ParkingPaginationDto) {
    return this.parkingSpotService.findAll(paginationDto);
  }
  @Get(':id')
  @Auth(ValidRoles.admin, ValidRoles.employee)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.parkingSpotService.findOne(id);
  }

  @Put(':id')
  @Auth(ValidRoles.admin)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateParkingSpotDto: UpdateParkingSpotDto,
  ) {
    return this.parkingSpotService.update(id, updateParkingSpotDto);
  }

  @Delete(':id')
  @Auth(ValidRoles.admin)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.parkingSpotService.remove(id);
  }
}
