import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('staff')
@ApiBearerAuth()
@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner', 'admin') // Only Owners/Admins can manage staff
export class StaffController {
  constructor(private readonly svc: StaffService) {}

  @Get()
  async findAll(@Req() req: any, @Query('hotelId') queryHotelId: string) {
    const hotelId = queryHotelId || req.user.roleAssignments?.[0]?.hotelId; // Prioritize Query
    if (!hotelId) throw new Error("No hotel context");
    return this.svc.findAll(hotelId);
  }

  @Post()
  async create(@Req() req: any, @Body() body: any, @Query('hotelId') queryHotelId: string) {
      const hotelId = queryHotelId || body.hotelId || req.user.roleAssignments?.[0]?.hotelId;
      return this.svc.create(hotelId, body);
  }

  @Put(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any, @Query('hotelId') queryHotelId: string) {
      const hotelId = queryHotelId || body.hotelId || req.user.roleAssignments?.[0]?.hotelId;
      return this.svc.updateRole(hotelId, id, body.role);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string, @Query('hotelId') queryHotelId: string) {
      const hotelId = queryHotelId || req.user.roleAssignments?.[0]?.hotelId;
      return this.svc.remove(hotelId, id);
  }
}
