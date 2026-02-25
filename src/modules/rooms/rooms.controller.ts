import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query, Request } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('rooms')
@Controller('rooms')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @Permissions('read:rooms')
  findAll(@Query('search') search?: string, @Query('hotelId') hotelId?: string) {
    return this.roomsService.findAll(search, hotelId);
  }

  @Get('available')
  @Permissions('read:rooms')
  getAvailable(
      @Query('roomTypeId') roomTypeId: string,
      @Query('checkIn') checkIn: string,
      @Query('checkOut') checkOut: string
  ) {
      return this.roomsService.getAvailableRooms(roomTypeId, checkIn, checkOut);
  }

  @Post()
  @Permissions('manage:rooms')
  create(@Body() createRoomDto: any) {
    return this.roomsService.create(createRoomDto);
  }

  @Post('bulk')
  @Permissions('manage:rooms')
  createBulk(@Body() body: { roomTypeId: string; prefix?: string; startNumber: number; count: number }) {
    return this.roomsService.createBulk(body);
  }

  @Get(':id')
  @Permissions('read:rooms')
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Put(':id')
  @Permissions('manage:rooms')
  update(@Param('id') id: string, @Body() updateRoomDto: any) {
    return this.roomsService.update(id, updateRoomDto);
  }

  @Delete(':id')
  @Permissions('manage:rooms')
  remove(@Param('id') id: string) {
    return this.roomsService.remove(id);
  }

  @Put(':id/status')
  @Permissions('update:room_status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string, note?: string }, @Request() req) {
    return this.roomsService.updateStatus(id, body.status, req.user?.id, body.note);
  }
}
