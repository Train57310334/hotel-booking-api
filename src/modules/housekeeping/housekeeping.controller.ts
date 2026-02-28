import { Controller, Get, Param, Put, Body, UseGuards, Req } from '@nestjs/common';
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
  @Roles('platform_admin', 'owner', 'admin', 'receptionist') // Add housekeeping role if created
  async getHousekeepingStatus(@Param('hotelId') hotelId: string) {
    return this.housekeepingService.getHousekeepingStatus(hotelId);
  }

  @Put('rooms/:roomId/status')
  @Roles('platform_admin', 'owner', 'admin', 'receptionist')
  async updateRoomStatus(
    @Param('roomId') roomId: string,
    @Body('status') status: RoomStatus,
    @Body('note') note: string,
    @Req() req: any
  ) {
    return this.housekeepingService.updateRoomStatus(roomId, status, req.user?.userId, note);
  }
}
