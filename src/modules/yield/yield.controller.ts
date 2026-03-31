import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { YieldService } from './yield.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HotelAuthGuard } from '../auth/guards/hotel-auth.guard';

@ApiTags('yield')
@ApiBearerAuth()
@Controller('yield')
@UseGuards(JwtAuthGuard, HotelAuthGuard)
export class YieldController {
  constructor(private readonly yieldService: YieldService) {}

  @Get('rules')
  getRules(@Query('hotelId') hotelId: string) {
    if (!hotelId) throw new ForbiddenException('Hotel ID is required');
    return this.yieldService.getRules(hotelId);
  }

  @Post('rules')
  createRule(@Body() body: any) {
    if (!body.hotelId) throw new ForbiddenException('Hotel ID is required');
    return this.yieldService.createRule(body);
  }

  @Put('rules/:id')
  updateRule(@Param('id') id: string, @Body() body: any) {
    return this.yieldService.updateRule(id, body);
  }

  @Delete('rules/:id')
  deleteRule(@Param('id') id: string) {
    return this.yieldService.deleteRule(id);
  }
}
