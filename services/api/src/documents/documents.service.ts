import { Injectable } from '@nestjs/common';
import { CreateDocumentDto } from './dto/document.dto';
import { DocumentsRepository } from './documents.repository';

@Injectable()
export class DocumentsService {
  constructor(private readonly repo: DocumentsRepository) {}
  create(dto: CreateDocumentDto) { return this.repo.prisma.document.create({ data: dto }); }
  list(patientId: string) { return this.repo.prisma.document.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } }); }
}
