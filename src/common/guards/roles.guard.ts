import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ValidRoles } from '../enums/valid-roles.enum';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { User } from 'src/users/entities/user.entity';
import { Request } from 'express';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const validRoles: ValidRoles[] = this.reflector.get(
      ROLES_KEY,
      context.getHandler(),
    );
    if (!validRoles || validRoles.length === 0) return true;
    const req: Request = context.switchToHttp().getRequest();
    const user = req.user as User;
    if (!user) throw new BadRequestException('User not found');
    console.log({ validRoles });
    for (const role of user.roles) {
      if (validRoles.includes(ValidRoles[role])) {
        console.log({ ValidRoles: validRoles.includes(ValidRoles[role]) });
        return true;
      }
    }
    throw new ForbiddenException(
      `User ${user.name} need a valid role [${validRoles}]`,
    );
  }
}
