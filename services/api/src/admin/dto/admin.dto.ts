import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserRoleDto {
  @IsString()
  userId!: string;

  @IsString()
  @IsIn(['USER', 'ADMIN', 'AUDITOR'])
  role!: 'USER' | 'ADMIN' | 'AUDITOR';
}

export class AdminLoginDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsOptional()
  deviceId?: string;
}

export class AdminRefreshDto {
  @IsString()
  @IsOptional()
  deviceId?: string;
}

export class ModuleQueryDto {
  @IsString()
  @IsOptional()
  q?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}

export class AdminInterventionDto {
  @IsString()
  @IsIn(['cancelar', 'reprogramar', 'devolver', 'publicar'])
  action!: 'cancelar' | 'reprogramar' | 'devolver' | 'publicar';
}
