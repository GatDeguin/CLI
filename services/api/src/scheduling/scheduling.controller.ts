import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { BookingRequest, CoverageProfile } from './scheduling.types';

@Controller('scheduling')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Get('slots')
  listSlots() {
    return this.schedulingService.listAvailableSlots();
  }

  @Post('slots/:slotId/hold')
  holdSlot(
    @Headers() headers: Record<string, string | undefined>,
    @Param('slotId') slotId: string,
    @Body() body: { patientId: string }
  ) {
    return this.schedulingService.holdSlot(headers, slotId, body.patientId);
  }

  @Get('slots/:slotId/pricing/:profile')
  pricing(@Param('slotId') slotId: string, @Param('profile') profile: CoverageProfile) {
    return this.schedulingService.evaluatePricing(slotId, profile);
  }

  @Post('bookings')
  book(@Headers() headers: Record<string, string | undefined>, @Body() body: BookingRequest) {
    return this.schedulingService.bookAppointment(headers, body);
  }
}
