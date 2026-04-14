import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ActiveProfileRequired } from '../common/auth/active-profile.decorator';
import { CreateCoverageDto } from './dto/coverage.dto';
import { CoverageService } from './coverage.service';

@Controller('coverage')
export class CoverageController {
  constructor(private readonly service: CoverageService) {}
  @Post() create(@Body() dto: CreateCoverageDto) { return this.service.create(dto); }
  @ActiveProfileRequired()
  @Get(':patientId') list(@Param('patientId') patientId: string) { return this.service.list(patientId); }
}
