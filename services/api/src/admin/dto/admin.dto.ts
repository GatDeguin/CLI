import { IsEnum, IsString } from 'class-validator';

export class UpdateUserRoleDto {
  @IsString() userId!: string;
  @IsEnum({ USER: 'USER', ADMIN: 'ADMIN', AUDITOR: 'AUDITOR' }) role!: 'USER' | 'ADMIN' | 'AUDITOR';
}
