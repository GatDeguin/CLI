import { Injectable } from '@nestjs/common';
import { CreateCoverageDto } from './dto/coverage.dto';
import { CoverageRepository } from './coverage.repository';

@Injectable()
export class CoverageService {
  constructor(private readonly repo: CoverageRepository) {}
  create(dto: CreateCoverageDto) {
    return this.repo.prisma.coverage.create({ data: { ...dto, validFrom: new Date(dto.validFrom) } });
  }
  list(patientId: string) {
    return this.repo.prisma.coverage.findMany({ where: { patientId }, include: { plan: true } });
  }
}
