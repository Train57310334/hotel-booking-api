import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';

class CreateBookingDto {
  hotelId: string;
  roomTypeId: string;
  ratePlanId: string;
  checkIn: string;
  checkOut: string;
  guests?: { adult: number; child: number };
  leadGuest: { name: string; email: string; phone: string };
  specialRequests?: string;
  totalAmount?: number;
}

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private svc: BookingsService) {}

  @Post()
  create(@Body() dto: CreateBookingDto) {
    return this.svc.create(dto);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.find(id);
  }
}
