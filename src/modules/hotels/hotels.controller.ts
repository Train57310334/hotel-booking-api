import { Controller, Get, Param, Query, Put, Body } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HotelsService } from './hotels.service';

@ApiTags('hotels')
@Controller('hotels')
export class HotelsController {
  constructor(private hotels: HotelsService) {}

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
