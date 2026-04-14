import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ActiveProfileRequired } from '../common/auth/active-profile.decorator';
import { CreateDocumentDto } from './dto/document.dto';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}
  @Post() create(@Body() dto: CreateDocumentDto) { return this.service.create(dto); }
  @ActiveProfileRequired()
  @Get('patient/:patientId') list(@Param('patientId') patientId: string) { return this.service.list(patientId); }
}
