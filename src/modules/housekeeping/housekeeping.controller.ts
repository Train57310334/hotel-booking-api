import { Controller, Get, Param, Put, Post, Body, UseGuards, Req } from '@nestjs/common';
import { HousekeepingService } from './housekeeping.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoomStatus } from '@prisma/client';

@Controller('housekeeping')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HousekeepingController {
  constructor(private readonly housekeepingService: HousekeepingService) {}

  @Get(':hotelId')
  @Roles('platform_admin', 'owner', 'admin', 'receptionist', 'housekeeper')
  async getHousekeepingStatus(@Param('hotelId') hotelId: string) {
    return this.housekeepingService.getHousekeepingStatus(hotelId);
  }

  @Put('rooms/:roomId/status')
  @Roles('platform_admin', 'owner', 'admin', 'receptionist', 'housekeeper')
  async updateRoomStatus(
    @Param('roomId') roomId: string,
    @Body('status') status: RoomStatus,
    @Body('note') note: string,
    @Req() req: any,
  ) {
    return this.housekeepingService.updateRoomStatus(roomId, status, req.user?.userId, note);
  }

  // ─── Maintenance Reports ────────────────────────────────────────────────────

  @Post('rooms/:roomId/report')
  @Roles('platform_admin', 'owner', 'admin', 'receptionist', 'housekeeper')
  async createReport(
    @Param('roomId') roomId: string,
    @Body() body: { category: string; description: string; priority?: string; reportedBy?: string },
  ) {
    return this.housekeepingService.createMaintenanceReport(roomId, body);
  }

  @Get(':hotelId/reports')
  @Roles('platform_admin', 'owner', 'admin', 'receptionist')
  async getReports(@Param('hotelId') hotelId: string) {
    return this.housekeepingService.getMaintenanceReports(hotelId);
  }

  @Put('reports/:id/resolve')
  @Roles('platform_admin', 'owner', 'admin', 'receptionist')
  async resolveReport(@Param('id') id: string) {
    return this.housekeepingService.resolveMaintenanceReport(id);
  }
}
