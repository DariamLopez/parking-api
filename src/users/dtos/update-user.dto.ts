import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ValidRoles } from 'src/common';

export class updateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(ValidRoles, { each: true })
  @IsOptional()
  roles?: string[];
}
