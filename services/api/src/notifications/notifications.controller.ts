import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import { Public } from '../common/auth/public.decorator';
import { Roles } from '../common/auth/roles.decorator';
import { DispatchStatusDto, QueueNotificationEventDto, UpsertNotificationTemplateDto } from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@Roles('ADMIN', 'AUDITOR', 'USER')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('templates')
  @Roles('ADMIN', 'AUDITOR')
  listTemplates() {
    return this.service.listTemplates();
  }

  @Put('templates')
  @Roles('ADMIN')
  upsertTemplate(@Req() req: { user?: { sub?: string } }, @Body() dto: UpsertNotificationTemplateDto) {
    return this.service.upsertTemplate(dto, req.user?.sub);
  }

  @Post('events')
  queueEvent(@Body() dto: QueueNotificationEventDto) {
    return this.service.queueEvent(dto);
  }

  @Post('internal/dispatches/:dispatchId/status')
  @Public()
  updateDispatchStatus(@Param('dispatchId') dispatchId: string, @Body() dto: DispatchStatusDto) {
    return this.service.updateDispatchStatus(dispatchId, dto);
  }

  @Get('dispatches/:dispatchId/audit')
  @Roles('ADMIN', 'AUDITOR')
  listDispatchAudit(@Param('dispatchId') dispatchId: string) {
    return this.service.listDispatchAudits(dispatchId);
  }
}
