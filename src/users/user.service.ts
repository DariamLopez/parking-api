import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { ConfigService } from '@nestjs/config';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { LogsService } from 'src/logs/logs.service';
import { LogType } from 'src/logs/shemas/activity-log.shema';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => LogsService))
    private readonly logService: LogsService,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<User>> {
    const { limit = 10, offset = 0, order = 'ASC' } = paginationDto;
    const [users, total] = await this.userRepository.findAndCount({
      take: limit,
      skip: offset,
      order: {
        name: order,
      },
    });
    const baseUrl =
      this.configService.get<string>('API_HOST') +
      ':' +
      this.configService.get<string>('PORT') +
      '/api';
    return {
      data: users,
      pagination: {
        limit,
        offset,
        total,
        page: Math.ceil(offset / limit) + 1,
      },
      links: {
        ...(offset > 0
          ? {
              prev: `${baseUrl}/users?limit=${limit}&offset=${Math.max(offset - limit, 0)}&order=${order}`,
            }
          : {}),
        ...(offset + limit < total
          ? {
              next: `${baseUrl}/users?limit=${limit}&offset=${offset + limit}&order=${order}`,
            }
          : {}),
      },
    };
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async update(
    id: string,
    data: Partial<User>,
    adminUser: User,
  ): Promise<User> {
    const user = await this.findById(id);
    // console.log(data);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    const updatedUser = new User();
    Object.assign(updatedUser, user, data);

    try {
      await this.userRepository.update(id, updatedUser);
      //console.log('user:', user);
      await this.logService.log(LogType.USER_UPDATED, adminUser.id, {
        oldData: { ...user },
        changes: updatedUser,
      });
      return updatedUser;
    } catch (error) {
      // console.log(error);
      this.handleDBErrors(error);
    }
  }

  async remove(id: string): Promise<User> {
    const user = await this.findById(id);
    return this.userRepository.remove(user as User);
  }

  private handleDBErrors(error: any): never {
    if ((error as { code: string }).code === '23505') {
      throw new BadRequestException((error as { detail: string }).detail);
    }
    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected error, check server logs',
    );
  }
}
