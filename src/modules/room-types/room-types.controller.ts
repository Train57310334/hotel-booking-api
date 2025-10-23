import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoomTypesService } from './room-types.service';

@ApiTags('room-types')
@Controller('room-types')
export class RoomTypesController {
  constructor(private svc: RoomTypesService) {}

  @Get('by-hotel/:hotelId')
  byHotel(@Param('hotelId') hotelId: string) { return this.svc.listByHotel(hotelId); }
}
