import { Controller, Get, Post, Query, UseGuards, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChannelsService } from './channels.service';

@ApiTags('channels')
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('status')
  getChannelStatuses(@Query('hotelId') hotelId: string) {
    if (!hotelId) throw new Error('hotelId is required');
    return this.channelsService.getChannelStatuses(hotelId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':hotelId/sync')
  syncInventory(@Param('hotelId') hotelId: string) {
    return this.channelsService.syncInventory(hotelId);
  }
}
