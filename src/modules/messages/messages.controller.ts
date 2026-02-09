import { Body, Controller, Get, Param, Post, Put, Query, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private svc: MessagesService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('search') search?: string, @Query('hotelId') hotelId?: string) {
    return this.svc.findAll(search, hotelId);
  }

  // Public endpoint for "Contact Us" form
  @Post()
  create(@Body() body: any) {
    return this.svc.create(body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.svc.markAsRead(id);
  }
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/reply')
  reply(@Param('id') id: string, @Body() body: { content: string }) {
    return this.svc.reply(id, body.content);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Put(':id/archive')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}
