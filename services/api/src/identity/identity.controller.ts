import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { Public } from '../common/auth/public.decorator';
import {
  ChangePasswordDto,
  LoginDto,
  RegisterByDniDto,
  RequestOtpDto,
  RequestRecoveryDto,
  ResetPasswordDto,
  RevokeSessionDto
} from './dto/identity.dto';
import { IdentityService } from './identity.service';

@Controller('identity')
export class IdentityController {
  constructor(private readonly service: IdentityService) {}

  @Public()
  @Post('register/dni')
  registerByDni(@Body() dto: RegisterByDniDto) {
    return this.service.registerByDni(dto);
  }

  @Public()
  @Post('otp/request')
  requestOtp(@Req() req: { ip?: string }, @Body() dto: RequestOtpDto) {
    return this.service.requestOtp({ ...dto, ipAddress: dto.ipAddress ?? req.ip });
  }

  @Public()
  @Post('login')
  login(@Req() req: { ip?: string }, @Body() dto: LoginDto) {
    return this.service.login({ ...dto, ipAddress: dto.ipAddress ?? req.ip });
  }

  @Public()
  @Post('access/recovery/request')
  requestRecovery(@Req() req: { ip?: string }, @Body() dto: RequestRecoveryDto) {
    return this.service.requestRecovery({ ...dto, ipAddress: dto.ipAddress ?? req.ip });
  }

  @Public()
  @Post('access/recovery/reset')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.service.resetPassword(dto);
  }

  @Patch('password')
  changePassword(@Req() req: { user: { sub: string } }, @Body() dto: ChangePasswordDto) {
    return this.service.changePassword(req.user.sub, dto);
  }

  @Get('sessions')
  listSessions(@Req() req: { user: { sub: string } }) {
    return this.service.listSessions(req.user.sub);
  }

  @Post('sessions/revoke')
  revokeSession(@Req() req: { user: { sub: string } }, @Body() dto: RevokeSessionDto) {
    return this.service.revokeSession(req.user.sub, dto.sessionId);
  }
}
