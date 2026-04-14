import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class IdentityRepository {
  constructor(public readonly prisma: PrismaService) {}
}
