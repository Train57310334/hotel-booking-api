import { Controller, Get, Param, Res } from '@nestjs/common';
import { IcalService } from './ical.service';
import { Response } from 'express';

@Controller('ical')
export class IcalController {
  constructor(private readonly icalService: IcalService) {}

  @Get('export/:hotelId')
  async exportIcal(
    @Param('hotelId') hotelId: string,
    @Res() res: Response,
  ) {
    const calendarString = await this.icalService.generateIcal(hotelId);
    
    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="hotel-${hotelId}.ics"`,
    });
    
    res.send(calendarString);
  }
}
