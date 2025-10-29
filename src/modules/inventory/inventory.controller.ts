import { Controller, Get, Param, Query, Body, Patch, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { Roles } from '@/modules/roles/roles.decorator';
import { RolesGuard } from '@/modules/roles/roles.guard';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hotel_admin', 'platform_admin')
  @Get(':roomTypeId')
  async getInventory(
    @Param('roomTypeId') roomTypeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.inventoryService.getInventoryByRoomType(roomTypeId, startDate, endDate);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('hotel_admin', 'platform_admin')
  @Patch(':roomTypeId/:date')
  async updateInventory(
    @Param('roomTypeId') roomTypeId: string,
    @Param('date') date: string,
    @Body() body: { allotment?: number; stopSale?: boolean; minStay?: number },
  ) {
    return this.inventoryService.updateInventory(roomTypeId, date, body);
  }
}
