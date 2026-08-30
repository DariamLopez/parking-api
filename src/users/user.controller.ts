import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/common';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { UserService } from './user.service';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from './entities/user.entity';
import { updateUserDto } from './dtos/update-user.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Get()
  @Auth(ValidRoles.admin)
  findAll(@Query() paginationDto: PaginationDto) {
    return this.userService.findAll(paginationDto);
  }

  @Get('me')
  @Auth()
  getProfile(@GetUser() user: User) {
    return user;
  }

  @Get(':id')
  @Auth(ValidRoles.admin)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findById(id);
  }

  @Put(':id')
  @Auth(ValidRoles.admin)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: updateUserDto,
    @GetUser() user: User,
  ) {
    return this.userService.update(id, updateUserDto, user);
  }

  @Delete(':id')
  @Auth(ValidRoles.admin)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.remove(id);
  }
}
