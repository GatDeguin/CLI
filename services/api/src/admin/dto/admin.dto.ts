import { IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

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

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  evidenceUrl?: string;

  @IsString()
  @IsOptional()
  refundType?: 'total' | 'partial';

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  refundAmount?: number;
}
