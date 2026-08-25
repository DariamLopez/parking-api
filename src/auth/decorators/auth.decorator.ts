import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles, RolesGuard, ValidRoles } from 'src/common';

export const Auth = (...args: ValidRoles[]) => {
  return applyDecorators(Roles(...args), UseGuards(AuthGuard(), RolesGuard));
};
