import { Controller, Get, Param, Query, Put, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags } from '@nestjs/swagger';
import { HotelsService } from './hotels.service';

@ApiTags('hotels')
@Controller('hotels')
export class HotelsController {
  constructor(private hotels: HotelsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('platform_admin', 'hotel_admin', 'owner') // Only owners can create hotels? or Platform Admin
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
