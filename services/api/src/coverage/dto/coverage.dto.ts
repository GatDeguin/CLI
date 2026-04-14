import { IsDateString, IsEnum, IsString } from 'class-validator';
import { CoverageStatus } from '@prisma/client';

export class CreateCoverageDto {
  @IsString() patientId!: string;
  @IsString() planId!: string;
  @IsString() memberNumber!: string;
  @IsEnum(CoverageStatus) status!: CoverageStatus;
  @IsDateString() validFrom!: string;
}
