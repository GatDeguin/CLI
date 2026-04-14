import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FamilyPermissionType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { CreateDocumentDto, CreateDocumentVersionDto, GenerateSignedUrlDto } from './dto/document.dto';
import { DocumentsRepository } from './documents.repository';

@Injectable()
export class DocumentsService {
  constructor(private readonly repo: DocumentsRepository) {}

  async create(dto: CreateDocumentDto) {
    return this.repo.prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          patientId: dto.patientId,
          type: dto.type,
          appointmentId: dto.appointmentId,
          url: dto.originalUrl,
          publishedAt: new Date()
        }
      });

      const version = await tx.documentVersion.create({
        data: {
          documentId: document.id,
          versionNumber: 1,
          storageUrl: dto.originalUrl,
          previewUrl: dto.previewUrl,
          thumbnailUrl: dto.thumbnailUrl,
          checksumSha256: dto.checksumSha256,
          mimeType: dto.mimeType,
          status: 'ACTIVE',
          validFrom: new Date(),
          createdByUserId: dto.createdByUserId
        }
      });

      return { ...document, currentVersionId: version.id };
    });
  }

  async createReplacementVersion(documentId: string, dto: CreateDocumentVersionDto, requestedByUserId: string) {
    const now = new Date();
    return this.repo.prisma.$transaction(async (tx) => {
      const document = await tx.document.findUnique({ where: { id: documentId } });
      if (!document) throw new NotFoundException('Documento no encontrado');

      const previous = await tx.documentVersion.findFirst({
        where: { documentId, status: 'ACTIVE', validTo: null },
        orderBy: { versionNumber: 'desc' }
      });

      const nextVersionNumber = (previous?.versionNumber ?? 0) + 1;
      if (previous) {
        await tx.documentVersion.update({
          where: { id: previous.id },
          data: {
            status: 'REPLACED',
            validTo: now,
            replacementNote: dto.reason,
            replacedByUserId: dto.replacedByUserId ?? requestedByUserId
          }
        });
      }

      await tx.documentSignedUrlToken.updateMany({
        where: {
          documentId,
          revokedAt: null,
          expiresAt: { gt: now }
        },
        data: {
          revokedAt: now,
          revokeReason: 'Version replaced'
        }
      });

      const nextVersion = await tx.documentVersion.create({
        data: {
          documentId,
          versionNumber: nextVersionNumber,
          storageUrl: dto.originalUrl,
          previewUrl: dto.previewUrl,
          thumbnailUrl: dto.thumbnailUrl,
          checksumSha256: dto.checksumSha256,
          mimeType: dto.mimeType,
          status: 'ACTIVE',
          validFrom: now,
          createdByUserId: dto.replacedByUserId ?? requestedByUserId
        }
      });

      return nextVersion;
    });
  }

  async list(patientId: string, activePatientId: string, userId: string) {
    await this.assertProfileAccess({ requestedPatientId: patientId, activePatientId, userId });
    return this.repo.prisma.document.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } });
  }

  async generateSignedUrl(documentId: string, dto: GenerateSignedUrlDto, ctx: { activePatientId: string; userId: string; ipAddress?: string; userAgent?: string }) {
    const document = await this.repo.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Documento no encontrado');

    await this.assertProfileAccess({ requestedPatientId: document.patientId, activePatientId: ctx.activePatientId, userId: ctx.userId });

    const version = await this.repo.prisma.documentVersion.findFirst({
      where: { documentId: document.id, status: 'ACTIVE', validTo: null },
      orderBy: { versionNumber: 'desc' }
    });
    if (!version) throw new NotFoundException('No hay versión activa del documento');

    const token = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (dto.ttlSeconds ?? 300) * 1000);
    const baseAssetUrl = dto.asset === 'THUMBNAIL' ? version.thumbnailUrl : dto.asset === 'PREVIEW' ? version.previewUrl : version.storageUrl;
    const signedUrl = `${baseAssetUrl ?? version.storageUrl}?token=${token}&exp=${Math.floor(expiresAt.getTime() / 1000)}`;

    const signed = await this.repo.prisma.documentSignedUrlToken.create({
      data: {
        documentId: document.id,
        documentVersionId: version.id,
        patientId: document.patientId,
        requestedByUserId: ctx.userId,
        action: dto.action,
        token,
        signedUrl,
        expiresAt
      }
    });

    await this.repo.prisma.documentAccessAudit.create({
      data: {
        documentId: document.id,
        documentVersionId: version.id,
        patientId: document.patientId,
        accessedByUserId: ctx.userId,
        action: dto.action,
        channel: 'PATIENT_API',
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent
      }
    });

    return { token: signed.token, signedUrl: signed.signedUrl, expiresAt: signed.expiresAt };
  }

  async revokeSignedUrl(token: string, reason: string | undefined, userId: string) {
    const current = await this.repo.prisma.documentSignedUrlToken.findUnique({ where: { token } });
    if (!current) throw new NotFoundException('Token firmado no encontrado');
    if (current.requestedByUserId !== userId) throw new ForbiddenException('No podés revocar este token');
    return this.repo.prisma.documentSignedUrlToken.update({
      where: { token },
      data: {
        revokedAt: new Date(),
        revokeReason: reason ?? 'Manual revocation'
      }
    });
  }

  async validateSignedUrl(token: string) {
    const row = await this.repo.prisma.documentSignedUrlToken.findUnique({ where: { token } });
    if (!row) throw new NotFoundException('Token firmado no encontrado');
    if (row.revokedAt) throw new ForbiddenException('URL firmada revocada');
    if (row.expiresAt.getTime() <= Date.now()) throw new ForbiddenException('URL firmada expirada');
    return row;
  }

  private async assertProfileAccess(params: { requestedPatientId: string; activePatientId: string; userId: string }) {
    const { requestedPatientId, activePatientId, userId } = params;
    if (requestedPatientId !== activePatientId) {
      throw new ForbiddenException('El paciente solicitado no coincide con el perfil activo');
    }

    const patient = await this.repo.prisma.patient.findUnique({
      where: { id: requestedPatientId },
      select: { userId: true }
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    if (patient.userId === userId) return;

    const now = new Date();
    const permission = await this.repo.prisma.familyPermission.findFirst({
      where: {
        tutorUserId: userId,
        dependentPatientId: requestedPatientId,
        permissionType: FamilyPermissionType.DOCUMENTS,
        validFrom: { lte: now },
        OR: [{ validTo: null }, { validTo: { gt: now } }]
      },
      select: { id: true }
    });

    if (!permission) throw new ForbiddenException('Sin autorización familiar para documentos');
  }
}
