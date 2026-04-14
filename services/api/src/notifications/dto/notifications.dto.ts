import { IsArray, IsBoolean, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

const CHANNELS = ['PUSH', 'EMAIL', 'SMS'] as const;

export class UpsertNotificationTemplateDto {
  @IsString()
  eventKey!: string;

  @IsString()
  @IsIn(CHANNELS)
  channel!: 'PUSH' | 'EMAIL' | 'SMS';

  @IsString()
  titleTemplate!: string;

  @IsString()
  bodyTemplate!: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class QueueNotificationEventDto {
  @IsString()
  eventId!: string;

  @IsString()
  eventKey!: string;

  @IsString()
  patientId!: string;

  @IsArray()
  @IsIn(CHANNELS, { each: true })
  channels!: Array<'PUSH' | 'EMAIL' | 'SMS'>;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  correlationId?: string;
}

export class DispatchStatusDto {
  @IsString()
  @IsIn(['SENT', 'FAILED', 'DELIVERED', 'DEAD_LETTERED', 'REPROCESSED'])
  status!: 'SENT' | 'FAILED' | 'DELIVERED' | 'DEAD_LETTERED' | 'REPROCESSED';

  @IsString()
  @IsOptional()
  providerRef?: string;

  @IsString()
  @IsOptional()
  error?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
