import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateDocumentDto {
  @IsString() patientId!: string;
  @IsString() type!: string;
  @IsUrl() url!: string;
  @IsOptional() @IsString() appointmentId?: string;
}
