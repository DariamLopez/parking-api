import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  ActivityLog,
  ActivityLogDocument,
  LogType,
} from './shemas/activity-log.shema';
import { Model } from 'mongoose';
import { LogQueryDto } from './dto/log-query.dto';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { ConfigService } from '@nestjs/config';
import { LogResponse } from './interfaces/log-response.interface';
import { UserService } from 'src/users/user.service';

@Injectable()
export class LogsService {
  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLogDocument>,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
  ) {}
  async log(
    type: LogType,
    userId: string,
    details: Record<string, any>,
  ): Promise<void> {
    const user = await this.userService.findById(userId);
    await this.activityLogModel.create({
      type,
      user: {
        id: user!.id,
        name: user!.name,
        email: user!.email,
      },
      details,
    });
  }
  async findAll(logsDto: LogQueryDto): Promise<PaginatedResponse<LogResponse>> {
    const { limit = 20, offset = 0, type, userId } = logsDto;
    const query: Record<string, any> = {};
    if (type) query.type = type;
    if (userId) query['user.id'] = userId;

    const [data, total] = await Promise.all([
      this.activityLogModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit),
      this.activityLogModel.countDocuments(query),
    ]);
    const baseUrl =
      this.configService.get<string>('API_HOST') +
      ':' +
      this.configService.get<string>('PORT') +
      '/api';
    return {
      data: data.map((log) => ({
        type: log.type,
        user: {
          name: log.user.name,
          email: log.user.email,
        },
        details: log.details,
        createdAt: log.createdAt,
      })),
      pagination: {
        limit,
        offset,
        total,
        page: Math.ceil(offset / limit) + 1,
      },
      links: {
        ...(offset > 0
          ? {
              prev: `${baseUrl}/logs?limit=${limit}&offset=${Math.max(offset - limit, 0)}${type ? `&type=${type}` : ''}`,
            }
          : {}),
        ...(offset + limit < total
          ? {
              next: `${baseUrl}/logs?limit=${limit}&offset=${offset + limit}${type ? `&type=${type}` : ''}`,
            }
          : {}),
      },
    };
  }
}
