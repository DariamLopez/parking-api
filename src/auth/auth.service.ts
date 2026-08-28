import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import bcrypt from 'bcryptjs';
import { LogsService } from 'src/logs/logs.service';
import { LogType } from 'src/logs/shemas/activity-log.shema';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly logService: LogsService,
  ) {}
  //Al registrar un usuario siempre se crea con el role 'client'
  //Para cambiar el role se debe usar el endpoint de update de usersController
  //Dicho endpoint solo está disponible para admins
  async register(registerDto: RegisterDto) {
    try {
      const { password, ...userData } = registerDto;

      const user = this.userRepository.create({
        ...userData,
        password: bcrypt.hashSync(password, 10),
      });
      await this.userRepository.save(user);
      await this.logService.log(LogType.USER_REGISTERED, user.id, {
        data: userData,
      });
      const { password: _pwd, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
      };
    } catch (error) {
      console.error(error);
      this.handleDbError(error);
    }
  }
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.userRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        roles: true,
      },
    });
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }
    if (!bcrypt.compareSync(password, user.password)) {
      throw new BadRequestException('Invalid credentials');
    }
    const { password: _pwd, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      token: this.getJwtToken({ id: user.id, email: user.email }),
    };
  }
  checkAuthStatus(user: User) {
    return {
      name: user.name,
      email: user.email,
      token: this.getJwtToken({ id: user.id, email: user.email }),
    };
  }

  private getJwtToken(payload: JwtPayload) {
    const token = this.jwtService.sign(payload);
    return token;
  }
  private handleDbError(error: any): never {
    if ((error as { code: string }).code === '23505') {
      throw new BadRequestException((error as { detail: string }).detail);
    }
    console.error(error);
    throw new InternalServerErrorException(
      'Unexpected error, check server logs',
    );
  }
}
