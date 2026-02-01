import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
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
  async revenue(@Req() req: any, @Query('from') from: string, @Query('to') to: string) {
    return this.svc.getRevenue(req.user.hotelId, new Date(from), new Date(to));
  }

  @Get('expenses')
  async expenses(@Req() req: any, @Query('from') from: string, @Query('to') to: string) {
    return this.svc.getExpenses(req.user.hotelId, new Date(from), new Date(to));
  }

  @Get('occupancy')
  async occupancy(@Req() req: any, @Query('from') from: string, @Query('to') to: string) {
    return this.svc.getOccupancy(req.user.hotelId, new Date(from), new Date(to));
  }

  @Get('sources')
  async sources(@Req() req: any, @Query('from') from: string, @Query('to') to: string) {
    return this.svc.getBookingSources(req.user.hotelId, new Date(from), new Date(to));
  }
  
  @Get('summary')
  async summary(@Req() req: any, @Query('from') from: string, @Query('to') to: string) {
    return this.svc.getSummary(req.user.hotelId, new Date(from), new Date(to));
  }
}
