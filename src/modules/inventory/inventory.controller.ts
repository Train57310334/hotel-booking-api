import {
  Controller,
  Get,
  Param,
  Query,
  Body,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { Role } from '@/modules/roles/role.enum';
import { Roles } from '@/modules/roles/roles.decorator';
import { RolesGuard } from '@/modules/roles/roles.guard';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /** 📅 ดึง Stock ของห้องรายวัน */
  @Roles(Role.HotelAdmin, Role.PlatformAdmin)
  @Get(':roomTypeId')
  async getInventory(
    @Param('roomTypeId') roomTypeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.inventoryService.getInventoryByRoomType(roomTypeId, startDate, endDate);
  }

  /** 🏨 อัปเดต Stock รายวัน */
  @Roles(Role.HotelAdmin, Role.PlatformAdmin)
  @Patch(':roomTypeId/:date')
  async updateInventory(
    @Param('roomTypeId') roomTypeId: string,
    @Param('date') date: string,
    @Body() body: UpdateInventoryDto,
  ) {
    return this.inventoryService.updateInventory(roomTypeId, date, body);
  }
}
