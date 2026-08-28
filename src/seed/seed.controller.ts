import { Controller, Post } from '@nestjs/common';
import { SeedService } from './seed.service';
import { Auth } from 'src/auth/decorators/auth.decorator';
import { ValidRoles } from 'src/common';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { User } from 'src/users/entities/user.entity';

@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}
  @Post()
  @Auth(ValidRoles.admin)
  runSeed(@GetUser() user: User) {
    return this.seedService.runSeed(user);
  }
}
