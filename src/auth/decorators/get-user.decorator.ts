import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request } from 'express';

export const GetUser = createParamDecorator((data, ctx: ExecutionContext) => {
  const request: Request = ctx.switchToHttp().getRequest();
  if (!request.user)
    throw new InternalServerErrorException('User not found in request');
  const user = request.user;
  return data ? user[data] : user;
});
