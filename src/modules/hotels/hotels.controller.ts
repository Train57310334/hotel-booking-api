import { Controller, Get, Param, Query, Put, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags } from '@nestjs/swagger';
import { HotelsService } from './hotels.service';

import { PaymentsService } from '../payments/payments.service';

@ApiTags('hotels')
@Controller('hotels')
export class HotelsController {
  constructor(
    private hotels: HotelsService,
    private paymentsService: PaymentsService 
  ) {}

  @Post(':id/upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'hotel_admin')
  upgrade(@Param('id') id: string) {
    return this.paymentsService.createUpgradeIntent(id);
  }

  @Get('super/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('platform_admin')
  listForSuperAdmin() {
    return this.hotels.listForSuperAdmin();
  }

  @Get('super/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('platform_admin')
  getSuperStats() {
    return this.hotels.getSuperStats();
  }

  @Put('super/:id/suspend')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('platform_admin')
  suspendHotel(@Param('id') id: string, @Body('isSuspended') isSuspended: boolean) {
    return this.hotels.suspendHotel(id, isSuspended);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('platform_admin', 'hotel_admin', 'owner')
  create(@Req() req, @Body() body: any) {
    return this.hotels.create(req.user.userId, body);
  }

  @Get()
  list(@Query() query: { checkIn?: string; checkOut?: string; guests?: string }) {
    if (query.checkIn && query.checkOut) {
      return this.hotels.search(query);
    }
    return this.hotels.list();
  }

  @Get(':id')
  get(@Param('id') id: string, @Query() query: { checkIn?: string; checkOut?: string; guests?: string }) {
    if (query.checkIn && query.checkOut) {
      return this.hotels.findWithAvailability(id, query);
    }
    return this.hotels.find(id);
  }

  @Put(':hotelId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  update(@Param('hotelId') id: string, @Body() body: any) {
    return this.hotels.update(id, body);
  }
}
