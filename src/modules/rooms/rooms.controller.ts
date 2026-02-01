import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Query } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('rooms')
@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.roomsService.findAll(search);
  }

  @Post()
  create(@Body() createRoomDto: any) {
    return this.roomsService.create(createRoomDto);
  }

  @Post('bulk')
  createBulk(@Body() body: { roomTypeId: string; prefix?: string; startNumber: number; count: number }) {
    return this.roomsService.createBulk(body);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateRoomDto: any) {
    return this.roomsService.update(id, updateRoomDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roomsService.remove(id);
  }
}
