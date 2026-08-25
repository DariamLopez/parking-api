import { SetMetadata } from '@nestjs/common';
import { ValidRoles } from 'src/common';

export const ROLES_KEY = 'roles';
export const Roles = (...args: ValidRoles[]) => SetMetadata(ROLES_KEY, args);
