import { Module } from '@nestjs/common';
import { PatientController } from './patient.controller';
import { PatientRepository } from './patient.repository';
import { PatientService } from './patient.service';

@Module({ controllers: [PatientController], providers: [PatientService, PatientRepository], exports: [PatientService] })
export class PatientModule {}
