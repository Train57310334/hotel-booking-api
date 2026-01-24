import { Controller, Get, Param, Post, Body, Put, Delete } from '@nestjs/common';
import { IsString, IsNumber, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiTags } from '@nestjs/swagger';
import { RoomTypesService } from './room-types.service';

@ApiTags('room-types')
@Controller('room-types')
export class RoomTypesController {
  constructor(private svc: RoomTypesService) {}

  @Get()
  findAll() { return this.svc.findAll(); }

  @Get('by-hotel/:hotelId')
  byHotel(@Param('hotelId') hotelId: string) { return this.svc.listByHotel(hotelId); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Post()
  create(@Body() body: any) { return this.svc.create(body); }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.svc.remove(id); }
}
