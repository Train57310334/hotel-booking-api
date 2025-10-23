import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';

class AvailabilityDto {
  hotelId: string;
  checkIn: string;
  checkOut: string;
}

@ApiTags('availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private svc: AvailabilityService) {}

  @Post('check')
  check(@Body() dto: AvailabilityDto) {
    return this.svc.check(dto.hotelId, new Date(dto.checkIn), new Date(dto.checkOut));
  }
}
