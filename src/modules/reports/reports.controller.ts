import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  @Get('revenue')
  revenue(@Query('from') f: string, @Query('to') t: string) {
    return { from: f, to: t, total: 0 };
  }
  @Get('occupancy')
  occupancy(@Query('from') f: string, @Query('to') t: string) {
    return { from: f, to: t, occupancyRate: 0 };
  }
  @Get('booking-source')
  source(@Query('from') f: string, @Query('to') t: string) {
    return { from: f, to: t, sources: [] };
  }
}
