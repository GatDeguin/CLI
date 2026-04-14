import { IsOptional, IsString } from 'class-validator';

export class AuditQueryDto {
  @IsOptional() @IsString() entity?: string;
  @IsOptional() @IsString() userId?: string;
}
