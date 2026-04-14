import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { Public } from '../common/auth/public.decorator';
import { Roles } from '../common/auth/roles.decorator';
import { AdminService } from './admin.service';
import { AdminInterventionDto, AdminLoginDto, ModuleQueryDto, UpdateUserRoleDto } from './dto/admin.dto';
import { PaymentsService } from '../payments/payments.service';

const REFRESH_COOKIE = 'admin_refresh_token';
const REFRESH_MAX_AGE_SECONDS = Number(process.env.ADMIN_REFRESH_TTL_SECONDS ?? 60 * 60 * 24 * 7);

const parseCookie = (header: string | undefined, cookieName: string): string | null => {
  if (!header) return null;
  const pair = header
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${cookieName}=`));
  if (!pair) return null;
  return decodeURIComponent(pair.substring(cookieName.length + 1));
};

@Controller('admin')
@Roles('ADMIN', 'AUDITOR', 'USER')
export class AdminController {
  constructor(
    private readonly service: AdminService,
    private readonly paymentsService: PaymentsService
  ) {}

  @Public()
  @Post('auth/login')
  async login(@Body() dto: AdminLoginDto, @Res({ passthrough: true }) res: any) {
    const payload = await this.service.login(dto);
    res.cookie(REFRESH_COOKIE, payload.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/admin/auth',
      maxAge: REFRESH_MAX_AGE_SECONDS * 1000
    });
    return {
      accessToken: payload.accessToken,
      expiresInSeconds: payload.expiresInSeconds,
      operator: payload.operator
    };
  }

  @Public()
  @Post('auth/refresh')
  async refresh(
    @Req() req: { headers: Record<string, string | undefined> },
    @Res({ passthrough: true }) res: any
  ) {
    const refreshToken = parseCookie(req.headers.cookie, REFRESH_COOKIE);
    if (!refreshToken) {
      res.clearCookie(REFRESH_COOKIE, { path: '/admin/auth' });
      return { accessToken: null };
    }

    const payload = await this.service.refresh(refreshToken);
    res.cookie(REFRESH_COOKIE, payload.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/admin/auth',
      maxAge: REFRESH_MAX_AGE_SECONDS * 1000
    });

    return {
      accessToken: payload.accessToken,
      expiresInSeconds: payload.expiresInSeconds,
      operator: payload.operator
    };
  }

  @Post('auth/logout')
  async logout(@Req() req: { headers: Record<string, string | undefined> }, @Res({ passthrough: true }) res: any) {
    const refreshToken = parseCookie(req.headers.cookie, REFRESH_COOKIE);
    if (refreshToken) {
      await this.service.logout(refreshToken);
    }
    res.clearCookie(REFRESH_COOKIE, { path: '/admin/auth' });
    return { revoked: true };
  }

  @Get('auth/me')
  me(@Req() req: { user: { sub: string } }) {
    return this.service.me(req.user.sub);
  }

  @Get('modules/:module/records')
  listRecords(
    @Req() req: { user: { role: 'ADMIN' | 'AUDITOR' | 'USER' } },
    @Param('module') module: string,
    @Query() query: ModuleQueryDto
  ) {
    return this.service.listRecords(req.user.role, module, query);
  }

  @Get('modules/:module/records/:recordId/history')
  listHistory(
    @Req() req: { user: { role: 'ADMIN' | 'AUDITOR' | 'USER' } },
    @Param('module') module: string,
    @Param('recordId') recordId: string
  ) {
    return this.service.listHistory(req.user.role, module, recordId);
  }

  @Post('modules/:module/records/:recordId/interventions')
  intervene(
    @Req() req: { user: { sub: string; role: 'ADMIN' | 'AUDITOR' | 'USER' } },
    @Param('module') module: string,
    @Param('recordId') recordId: string,
    @Body() dto: AdminInterventionDto
  ) {
    return this.service.intervene(req.user.sub, req.user.role, module, recordId, dto);
  }

  @Get('modules/:module/export')
  async exportModule(
    @Req() req: { user: { role: 'ADMIN' | 'AUDITOR' | 'USER' } },
    @Param('module') module: string,
    @Query('format') format: 'csv' | 'xlsx'
  ) {
    if (module === 'pagos') {
      return this.paymentsService.exportTreasury(
        { 'x-correlation-id': `admin-export-${Date.now()}` },
        format ?? 'csv'
      );
    }

    const records = await this.service.listRecords(req.user.role, module, { page: 1, pageSize: 200 });
    const headers = ['id', 'estado', 'cobertura', 'profesional', 'paciente', 'detalle'];
    const rows = records.items.map((record: { id: string; estado: string; cobertura: string; profesional: string; paciente: string; detalle: string }) =>
      [record.id, record.estado, record.cobertura, record.profesional, record.paciente, record.detalle].join(',')
    );
    return {
      format,
      contentType:
        format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv; charset=utf-8',
      data: [headers.join(','), ...rows].join('\n')
    };
  }

  @Roles('ADMIN')
  @Patch('users/role')
  updateRole(@Body() dto: UpdateUserRoleDto) {
    return this.service.updateRole(dto);
  }
}
