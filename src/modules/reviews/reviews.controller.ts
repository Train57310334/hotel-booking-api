import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  @Post(':hotelId')
  create(@Param('hotelId') hotelId: string, @Body() body: any) {
    // TODO: persist review
    return { hotelId, ...body, status: 'pending' };
  }

  @Get(':hotelId')
  list(@Param('hotelId') hotelId: string) {
    return { hotelId, reviews: [] };
  }
}
