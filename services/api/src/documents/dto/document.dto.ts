import { IsIn, IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

export class CreateDocumentDto {
  @IsString() patientId!: string;
  @IsString() type!: string;
  @IsUrl() originalUrl!: string;
  @IsOptional() @IsUrl() previewUrl?: string;
  @IsOptional() @IsUrl() thumbnailUrl?: string;
  @IsString() checksumSha256!: string;
  @IsString() mimeType!: string;
  @IsOptional() @IsString() createdByUserId?: string;
  @IsOptional() @IsString() appointmentId?: string;
}

export class CreateDocumentVersionDto {
  @IsUrl() originalUrl!: string;
  @IsOptional() @IsUrl() previewUrl?: string;
  @IsOptional() @IsUrl() thumbnailUrl?: string;
  @IsString() checksumSha256!: string;
  @IsString() mimeType!: string;
  @IsString() reason!: string;
  @IsOptional() @IsString() replacedByUserId?: string;
}

export class GenerateSignedUrlDto {
  @IsIn(['VIEW', 'DOWNLOAD']) action!: 'VIEW' | 'DOWNLOAD';
  @IsOptional() @IsInt() @Min(60) @Max(900) ttlSeconds?: number;
  @IsOptional() @IsIn(['ORIGINAL', 'PREVIEW', 'THUMBNAIL']) asset?: 'ORIGINAL' | 'PREVIEW' | 'THUMBNAIL';
}

export class RevokeSignedUrlDto {
  @IsOptional() @IsString() reason?: string;
}
