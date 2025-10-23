import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HotelsService } from './hotels.service';

@ApiTags('hotels')
@Controller('hotels')
export class HotelsController {
  constructor(private hotels: HotelsService) {}

  @Get()
  list() { return this.hotels.list(); }

  @Get(':id')
  get(@Param('id') id: string) { return this.hotels.find(id); }
}
