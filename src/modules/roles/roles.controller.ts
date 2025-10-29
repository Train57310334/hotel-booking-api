import { Controller, Post, Get, Delete, Param, Body, Query } from '@nestjs/common';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * 📍 POST /roles/assign
   * มอบหมาย role ให้ผู้ใช้
   */
  @Post('assign')
  async assignRole(
    @Body() body: { userId: string; role: string; hotelId?: string },
  ) {
    const { userId, role, hotelId } = body;
    return this.rolesService.assignRole(userId, role, hotelId);
  }

  /**
   * 📍 GET /roles/by-user/:id
   * ดู role ทั้งหมดของ user
   */
  @Get('by-user/:id')
  async getRolesByUser(@Param('id') userId: string) {
    return this.rolesService.getRolesByUser(userId);
  }

  /**
   * 📍 DELETE /roles/:id
   * ลบ role ออกจาก user
   */
  @Delete(':id')
  async revokeRole(@Param('id') id: string) {
    return this.rolesService.revokeRole(id);
  }

  /**
   * 📍 GET /roles/hotel-admins
   * รายชื่อผู้ดูแลโรงแรมทั้งหมด
   */
  @Get('hotel-admins')
  async listHotelAdmins() {
    return this.rolesService.listHotelAdmins();
  }
}
