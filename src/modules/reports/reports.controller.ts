import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private svc: ReportsService) {}

  @Get('revenue')
  async revenue(@Query('from') from: string, @Query('to') to: string) {
    return this.svc.getRevenue(new Date(from), new Date(to));
  }

  @Get('occupancy')
  async occupancy(@Query('from') from: string, @Query('to') to: string) {
    return this.svc.getOccupancy(new Date(from), new Date(to));
  }

  @Get('sources')
  async sources(@Query('from') from: string, @Query('to') to: string) {
    return this.svc.getBookingSources(new Date(from), new Date(to));
  }
  
  @Get('summary')
  async summary(@Query('from') from: string, @Query('to') to: string) {
    return this.svc.getSummary(new Date(from), new Date(to));
  }
}
