import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ActiveProfileRequired } from '../common/auth/active-profile.decorator';
import { CreatePatientDto } from './dto/patient.dto';
import { PatientService } from './patient.service';

@Controller('patient')
export class PatientController {
  constructor(private readonly service: PatientService) {}

  @Post()
  create(@Req() req: { user: { sub: string } }, @Body() dto: CreatePatientDto) {
    return this.service.create(req.user.sub, dto);
  }

  @ActiveProfileRequired()
  @Get('family')
  listFamily(@Req() req: { user: { sub: string } }) {
    return this.service.listByUser(req.user.sub);
  }
}
