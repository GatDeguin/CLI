import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';

export class CreatePatientDto {
  @IsString() @Matches(/^\d{7,10}$/) dni!: string;
  @IsString() fullName!: string;
  @IsDateString() birthDate!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
}
