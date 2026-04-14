import { Injectable } from '@nestjs/common';
import { CreatePatientDto } from './dto/patient.dto';
import { PatientRepository } from './patient.repository';

@Injectable()
export class PatientService {
  constructor(private readonly repo: PatientRepository) {}

  create(userId: string, dto: CreatePatientDto) {
    return this.repo.prisma.patient.create({ data: { ...dto, birthDate: new Date(dto.birthDate), userId } });
  }

  listByUser(userId: string) {
    return this.repo.prisma.patient.findMany({ where: { OR: [{ userId }, { dependentOfUserId: userId }] } });
  }
}
