import { IsNotEmpty, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

export class RegisterByDniDto {
  @IsString()
  @Matches(/^\d{7,10}$/)
  dni!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class RequestOtpDto {
  @IsString()
  @Matches(/^\d{7,10}$/)
  dni!: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  channel?: 'sms' | 'email';

  @IsString()
  @IsOptional()
  destination?: string;
}

export class LoginDto {
  @IsString()
  @Matches(/^\d{7,10}$/)
  dni!: string;

  @IsString()
  @Length(6, 6)
  otpCode!: string;

  @IsString()
  deviceId!: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;
}

export class RequestRecoveryDto {
  @IsString()
  @Matches(/^\d{7,10}$/)
  dni!: string;

  @IsString()
  @IsOptional()
  deviceId?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class RevokeSessionDto {
  @IsString()
  sessionId!: string;
}
