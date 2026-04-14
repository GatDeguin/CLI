import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ActiveProfileRequired } from '../common/auth/active-profile.decorator';
import { CreateDocumentDto, CreateDocumentVersionDto, GenerateSignedUrlDto, RevokeSignedUrlDto } from './dto/document.dto';
import { DocumentsService } from './documents.service';

type AuthRequest = {
  user: { sub: string };
  activePatientId: string;
  headers: Record<string, string>;
};

@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Post()
  create(@Body() dto: CreateDocumentDto) {
    return this.service.create(dto);
  }

  @Post(':documentId/versions')
  createVersion(@Param('documentId') documentId: string, @Body() dto: CreateDocumentVersionDto, @Req() req: AuthRequest) {
    return this.service.createReplacementVersion(documentId, dto, req.user.sub);
  }

  @ActiveProfileRequired()
  @Get('patient/:patientId')
  list(@Param('patientId') patientId: string, @Req() req: AuthRequest) {
    return this.service.list(patientId, req.activePatientId, req.user.sub);
  }

  @ActiveProfileRequired()
  @Post(':documentId/signed-url')
  signedUrl(@Param('documentId') documentId: string, @Body() dto: GenerateSignedUrlDto, @Req() req: AuthRequest) {
    return this.service.generateSignedUrl(documentId, dto, {
      activePatientId: req.activePatientId,
      userId: req.user.sub,
      ipAddress: req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent']
    });
  }

  @Post('signed-url/:token/revoke')
  revoke(@Param('token') token: string, @Body() dto: RevokeSignedUrlDto, @Req() req: AuthRequest) {
    return this.service.revokeSignedUrl(token, dto.reason, req.user.sub);
  }

  @Get('signed-url/:token/validate')
  validate(@Param('token') token: string) {
    return this.service.validateSignedUrl(token);
  }
}
