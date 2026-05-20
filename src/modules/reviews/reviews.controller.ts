import { Body, Controller, Get, Param, Post, Put, Delete, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private svc: ReviewsService) {}

  // ─── Public: Guest Token-Based Review ──────────────────────────────────────

  // Validate token & return booking info (no auth needed)
  @Get('request/:token')
  validateToken(@Param('token') token: string) {
    return this.svc.validateToken(token);
  }

  // Submit review via token (no auth needed)
  @Post('request/:token')
  submitGuestReview(
    @Param('token') token: string,
    @Body() body: { rating: number; comment?: string },
  ) {
    return this.svc.submitGuestReview(token, body.rating, body.comment || '');
  }

  // ─── Public: List approved reviews for a hotel ──────────────────────────────
  @Get('hotel/:hotelId')
  listPublic(@Param('hotelId') hotelId: string) {
    return this.svc.findByHotel(hotelId);
  }

  // ─── Authenticated: Create Review ──────────────────────────────────────────
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() body: { hotelId: string; rating: number; comment: string }) {
    return this.svc.create({ 
        userId: req.user.userId,
        ...body
    });
  }

  // ─── Admin: List All ───────────────────────────────────────────────────────
  // SECURITY FIX: Added RolesGuard + @Roles — was accessible to any logged-in user
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin', 'platform_admin')
  @Get('admin/all')
  findAll(@Query('status') status?: string, @Query('hotelId') hotelId?: string) {
    return this.svc.findAll(status, hotelId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin', 'platform_admin')
  @Get('admin/stats')
  getStats(@Query('hotelId') hotelId?: string) {
    return this.svc.getStats(hotelId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin', 'platform_admin')
  @Put('admin/:id/status')
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.svc.updateStatus(id, body.status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin', 'platform_admin')
  @Delete('admin/:id')
  delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}
