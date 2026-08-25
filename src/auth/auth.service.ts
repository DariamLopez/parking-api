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

// TODO: implementa la logica para que solo si el usuario que es admin pueda establecer roles de empleado o admin a otros usuarios
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}
  async register(registerDto: RegisterDto) {
    try {
      const { password, ...userData } = registerDto;

      const user = this.userRepository.create({
        ...userData,
        password: bcrypt.hashSync(password, 10),
      });
      await this.userRepository.save(user);
      const { password: _, ...userWithoutPassword } = user;
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
        //roles: true, //pasar role en caso de necesitar en Front
      },
    });
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }
    if (!bcrypt.compareSync(password, user.password)) {
      throw new BadRequestException('Invalid credentials');
    }
    const { password: _, ...userWithoutPassword } = user;
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
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    console.error(error);
    throw new InternalServerErrorException(
      'Unexpected error, check server logs',
    );
  }
}
