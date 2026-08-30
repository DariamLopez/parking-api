import { Controller, ForbiddenException, Post } from '@nestjs/common';
import { SeedService } from './seed.service';

@Controller('seed')
export class SeedController {
  constructor(private readonly seedService: SeedService) {}
  @Post()
  runSeed() {
    if (
      process.env.NODE_ENV !== 'development' &&
      process.env.NODE_ENV !== 'test'
    ) {
      throw new ForbiddenException(
        'Seed is only available in development and test environments',
      );
    }
    return this.seedService.runSeed();
  }
}
