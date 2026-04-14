import { BadRequestException, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { NotificationsRepository } from './notifications.repository';
import { DispatchStatusDto, QueueNotificationEventDto, UpsertNotificationTemplateDto } from './dto/notifications.dto';

const redisConnection = { url: process.env.REDIS_URL ?? 'redis://localhost:6379' };
const notificationQueue = new Queue('notifications-dispatch', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 4,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 1000,
    removeOnFail: 3000
  }
});

const SENSITIVE_PATTERNS = [
  /oncolog/gi,
  /vih/gi,
  /hiv/gi,
  /embaraz/gi,
  /psiquiatr/gi,
  /salud mental/gi,
  /diagn[oó]stic/gi,
  /resultado/gi,
  /laboratorio/gi,
  /estudio/gi,
  /tratamiento/gi,
  /medicaci[oó]n/gi
];

@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  listTemplates() {
    return this.repo.prisma.notificationTemplate.findMany({ orderBy: [{ eventKey: 'asc' }, { channel: 'asc' }] });
  }

  upsertTemplate(dto: UpsertNotificationTemplateDto, updatedBy?: string) {
    return this.repo.prisma.notificationTemplate.upsert({
      where: { eventKey_channel: { eventKey: dto.eventKey, channel: dto.channel } },
      create: {
        eventKey: dto.eventKey,
        channel: dto.channel,
        titleTemplate: dto.titleTemplate,
        bodyTemplate: dto.bodyTemplate,
        active: dto.active ?? true,
        updatedBy
      },
      update: {
        titleTemplate: dto.titleTemplate,
        bodyTemplate: dto.bodyTemplate,
        active: dto.active ?? true,
        updatedBy
      }
    });
  }

  async queueEvent(dto: QueueNotificationEventDto) {
    if (!dto.channels.length) throw new BadRequestException('Debe indicar al menos un canal');

    const patient = await this.repo.prisma.patient.findUnique({ where: { id: dto.patientId } });
    if (!patient) throw new BadRequestException('Paciente inválido');

    const responses = [];
    for (const channel of dto.channels) {
      const dispatchEventId = `${dto.eventId}:${channel}`;
      const existing = await this.repo.prisma.notificationDispatch.findUnique({ where: { eventId: dispatchEventId } });
      if (existing) {
        responses.push({ id: existing.id, eventId: existing.eventId, deduplicated: true });
        continue;
      }

      const template = await this.repo.prisma.notificationTemplate.findUnique({
        where: { eventKey_channel: { eventKey: dto.eventKey, channel } }
      });

      const renderedTitle = this.renderTemplate(template?.titleTemplate ?? dto.eventKey, dto.payload ?? {});
      const renderedBody = this.renderTemplate(template?.bodyTemplate ?? 'Tienes una nueva notificación.', dto.payload ?? {});
      const safeBody = channel === 'PUSH' ? this.sanitizeForLockScreen(renderedBody) : renderedBody;
      const safeTitle = channel === 'PUSH' ? this.sanitizeForLockScreen(renderedTitle) : renderedTitle;

      const dispatch = await this.repo.prisma.notificationDispatch.create({
        data: {
          eventId: dispatchEventId,
          eventKey: dto.eventKey,
          patientId: dto.patientId,
          channel,
          templateId: template?.id,
          title: safeTitle,
          body: safeBody,
          payload: (dto.payload ?? {}) as Prisma.InputJsonValue,
          correlationId: dto.correlationId ?? randomUUID()
        }
      });

      await this.repo.prisma.notificationDispatchAudit.create({
        data: {
          dispatchId: dispatch.id,
          eventType: 'QUEUED',
          metadata: { eventId: dispatch.eventId, channel, sanitized: channel === 'PUSH' }
        }
      });

      await notificationQueue.add(
        `dispatch-${dispatch.id}`,
        { dispatchId: dispatch.id, eventId: dispatch.eventId, correlationId: dispatch.correlationId },
        { jobId: `${dispatch.id}:${dispatch.eventId}` }
      );

      responses.push({ id: dispatch.id, eventId: dispatch.eventId, deduplicated: false });
    }

    return { queued: responses };
  }

  listDispatchAudits(dispatchId: string) {
    return this.repo.prisma.notificationDispatchAudit.findMany({ where: { dispatchId }, orderBy: { createdAt: 'desc' } });
  }

  async updateDispatchStatus(dispatchId: string, dto: DispatchStatusDto) {
    const now = new Date();
    const nextStatus: 'QUEUED' | 'SENT' | 'FAILED' =
      dto.status === 'DELIVERED' ? 'SENT' : dto.status === 'REPROCESSED' ? 'QUEUED' : dto.status === 'DEAD_LETTERED' ? 'FAILED' : dto.status;
    const patch = {
      status: nextStatus,
      providerRef: dto.providerRef,
      lastError: dto.error ?? null,
      sentAt: dto.status === 'SENT' ? now : undefined,
      deliveredAt: dto.status === 'DELIVERED' ? now : undefined,
      failedAt: dto.status === 'FAILED' ? now : undefined,
      deadLetteredAt: dto.status === 'DEAD_LETTERED' ? now : undefined,
      attempts: { increment: dto.status === 'REPROCESSED' ? 1 : 0 }
    };

    const dispatch = await this.repo.prisma.notificationDispatch.update({
      where: { id: dispatchId },
      data: patch
    });

    const metadata = dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : Prisma.JsonNull;
    await this.repo.prisma.notificationDispatchAudit.create({
      data: { dispatchId, eventType: dto.status, metadata }
    });

    return dispatch;
  }

  private renderTemplate(template: string, payload: Record<string, unknown>) {
    return template.replace(/{{\s*([\w.-]+)\s*}}/g, (_, key: string) => {
      const value = payload[key];
      return value == null ? '' : String(value);
    });
  }

  private sanitizeForLockScreen(content: string) {
    let sanitized = content;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[contenido protegido]');
    }
    if (sanitized.length > 120) {
      sanitized = `${sanitized.slice(0, 117)}...`;
    }
    return sanitized;
  }
}
