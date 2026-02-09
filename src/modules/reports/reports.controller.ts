import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner', 'admin')
export class ReportsController {
  constructor(private svc: ReportsService) {}

  private async getHotelId(req: any, queryHotelId?: string) {
      if (queryHotelId) return queryHotelId;
      if (req.user.hotelId) return req.user.hotelId;
      
      // Fallback for platform admins
      const defaultId = await this.svc.getDefaultHotelId();
      if (!defaultId) throw new Error('No hotel configured in system');
      return defaultId;
  }

  @Get('revenue')
  async revenue(@Req() req: any, @Query('from') from: string, @Query('to') to: string, @Query('hotelId') hotelId?: string) {
    const hId = await this.getHotelId(req, hotelId);
    return this.svc.getRevenue(hId, new Date(from), new Date(to));
  }

  @Get('expenses')
  async expenses(@Req() req: any, @Query('from') from: string, @Query('to') to: string, @Query('hotelId') hotelId?: string) {
    const hId = await this.getHotelId(req, hotelId);
    return this.svc.getExpenses(hId, new Date(from), new Date(to));
  }

  @Get('occupancy')
  async occupancy(@Req() req: any, @Query('from') from: string, @Query('to') to: string, @Query('hotelId') hotelId?: string) {
    const hId = await this.getHotelId(req, hotelId);
    return this.svc.getOccupancy(hId, new Date(from), new Date(to));
  }

  @Get('sources')
  async sources(@Req() req: any, @Query('from') from: string, @Query('to') to: string, @Query('hotelId') hotelId?: string) {
    const hId = await this.getHotelId(req, hotelId);
    return this.svc.getBookingSources(hId, new Date(from), new Date(to));
  }
  
  @Get('summary')
  async summary(@Req() req: any, @Query('from') from: string, @Query('to') to: string, @Query('hotelId') hotelId?: string) {
    const hId = await this.getHotelId(req, hotelId);
    return this.svc.getSummary(hotelId, new Date(from), new Date(to));
  }

  @Get('daily-stats')
  async dailyStats() {
      return this.svc.getDailyStats();
  }
}
