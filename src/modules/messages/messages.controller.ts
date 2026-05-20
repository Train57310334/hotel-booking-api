import { Body, Controller, Get, Param, Post, Put, Query, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private svc: MessagesService) {}

  // ─── Admin Endpoints (require role-based access) ──────────────────────────

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin', 'reception', 'platform_admin')
  @Get('unread-count')
  getUnreadCount(@Query('hotelId') hotelId: string) {
    return this.svc.getUnreadCount(hotelId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin', 'reception', 'platform_admin')
  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('hotelId') hotelId?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.findAll(search, hotelId, status);
  }

  // Public endpoint for "Contact Us" form
  @Post()
  create(@Body() body: any) {
    return this.svc.create(body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin', 'reception', 'platform_admin')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin', 'reception', 'platform_admin')
  @Put(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.svc.markAsRead(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin', 'reception', 'platform_admin')
  @Post(':id/reply')
  reply(
    @Param('id') id: string,
    @Body() body: { content: string; staffName?: string },
  ) {
    return this.svc.reply(id, body.content, body.staffName);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin', 'platform_admin')
  @Put(':id/archive')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin', 'platform_admin')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}
