import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { CheckinService } from './checkin.service';

@Controller('public/checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Get(':id/verify')
  async verifyCheckin(@Param('id') id: string, @Query('email') email: string) {
    return this.checkinService.validateCheckin(id, email);
  }

  @Post(':id/submit')
  async submitCheckin(@Param('id') id: string, @Body() payload: any) {
    return this.checkinService.submitCheckin(id, payload);
  }
}
