import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { UpdateParkingSpotDto } from './dto/update-parking-spot.dto';
import { ParkingSpot } from './entities/parking-spot.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { ConfigService } from '@nestjs/config';
import { ParkingPaginationDto } from './dto/parking-pagination.dto';

@Injectable()
export class ParkingSpotService {
  private readonly logger = new Logger(ParkingSpotService.name);
  constructor(
    @InjectRepository(ParkingSpot)
    private readonly parkingSpotRepository: Repository<ParkingSpot>,
    private readonly configService: ConfigService,
  ) {}
  async create(
    createParkingSpotDto: CreateParkingSpotDto,
  ): Promise<ParkingSpot> {
    try {
      const parkingSpot =
        this.parkingSpotRepository.create(createParkingSpotDto);
      await this.parkingSpotRepository.save(parkingSpot);
      return parkingSpot;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async findAll(
    paginationDto: ParkingPaginationDto,
  ): Promise<PaginatedResponse<ParkingSpot>> {
    const {
      limit = 10,
      offset = 0,
      order = 'ASC',
      isActive = undefined,
    } = paginationDto;
    const [result, total] = await this.parkingSpotRepository.findAndCount({
      take: limit,
      skip: offset,
      order: {
        code: order,
      },
      where: isActive !== undefined ? { isActive: isActive } : {},
    });
    const baseUrl =
      this.configService.get<string>('API_HOST') +
      ':' +
      this.configService.get<string>('PORT') +
      '/api';
    return {
      data: result,
      pagination: {
        limit,
        offset,
        total,
        page: Math.ceil(offset / limit) + 1,
      },
      links: {
        ...(offset > 0
          ? {
              prev: `${baseUrl}/parking-spot?limit=${limit}&offset=${Math.max(offset - limit, 0)}${order ? `&order=${order}` : ''}${isActive !== undefined ? `&isActive=${isActive}` : ''}`,
            }
          : {}),
        ...(offset + limit < total
          ? {
              next: `${baseUrl}/parking-spot?limit=${limit}&offset=${offset + limit}${order ? `&order=${order}` : ''}${isActive !== undefined ? `&isActive=${isActive}` : ''}`,
            }
          : {}),
      },
    };
  }

  async findOne(id: string): Promise<ParkingSpot> {
    const parkingSpot = await this.parkingSpotRepository.findOneBy({ id });
    if (!parkingSpot)
      throw new NotFoundException(`Parking spot with ID ${id} not found`);
    return parkingSpot;
  }
  async findActiveSpots(): Promise<ParkingSpot[]> {
    return this.parkingSpotRepository.find({
      where: { isActive: true },
      order: { code: 'ASC' },
    });
  }

  async update(
    id: string,
    updateParkingSpotDto: UpdateParkingSpotDto,
  ): Promise<ParkingSpot> {
    const parkingSpot = await this.findOne(id);
    Object.assign(parkingSpot, updateParkingSpotDto);
    try {
      await this.parkingSpotRepository.save(parkingSpot);
      return parkingSpot;
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async remove(id: string): Promise<ParkingSpot> {
    const parkingSpot = await this.findOne(id);
    return this.parkingSpotRepository.remove(parkingSpot);
  }

  /* async getCurrentOccupancy(): {

  } */

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
