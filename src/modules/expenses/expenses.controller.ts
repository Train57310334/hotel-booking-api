import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HotelAuthGuard } from '../auth/guards/hotel-auth.guard';
import { ForbiddenException } from '@nestjs/common';

@ApiTags('expenses')
@ApiBearerAuth()
@Controller('expenses')
@UseGuards(JwtAuthGuard, HotelAuthGuard)
export class ExpensesController {
  constructor(private svc: ExpensesService) {}

  @Post()
  create(@Req() req, @Body() body: any) {
    if (!body.hotelId) throw new ForbiddenException('Hotel ID is required');
    return this.svc.create(body);
  }

  @Get()
  list(@Query('hotelId') hotelId: string, @Query('from') from: string, @Query('to') to: string) {
    if (!hotelId) throw new ForbiddenException('Hotel ID is required');
    return this.svc.findAll(hotelId, from, to);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}
