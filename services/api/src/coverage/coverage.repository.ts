import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class CoverageRepository { constructor(readonly prisma: PrismaService) {} }
