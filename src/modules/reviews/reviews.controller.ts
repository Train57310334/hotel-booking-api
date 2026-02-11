import { Body, Controller, Get, Param, Post, Put, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private svc: ReviewsService) {}

  // Public: List approved reviews for a hotel
  @Get('hotel/:hotelId')
  listPublic(@Param('hotelId') hotelId: string) {
    return this.svc.findByHotel(hotelId);
  }

  // User: Create Review
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() body: { hotelId: string; rating: number; comment: string }) {
    return this.svc.create({ 
        userId: req.user.userId,
        ...body
    });
  }

  // Admin: List All (Filtered by Hotel)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('admin/all')
  findAll(@Query('status') status?: string, @Query('hotelId') hotelId?: string) {
    return this.svc.findAll(status, hotelId);
  }

  // Admin: Stats (Filtered by Hotel)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('admin/stats')
  getStats(@Query('hotelId') hotelId?: string) {
    return this.svc.getStats(hotelId);
  }

  // Admin: Moderate
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put('admin/:id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.svc.updateStatus(id, body.status);
  }

  @Delete('admin/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}
