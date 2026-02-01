import { Controller, Get, Param, Query, Put, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';
import { HotelsService } from './hotels.service';

@ApiTags('hotels')
@Controller('hotels')
export class HotelsController {
  constructor(private hotels: HotelsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
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

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.hotels.update(id, body);
  }
}
