import { Controller, Get, Put, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChannelsService } from './channels.service';

@ApiTags('channels')
@Controller('channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get(':hotelId')
  getChannelStatus(@Param('hotelId') hotelId: string) {
    return this.channelsService.getChannelStatus(hotelId);
  }

  @Put('roomtype/:id/mapping')
  updateRoomMapping(
    @Param('id') id: string,
    @Body() body: { url?: string; channelManagerRoomId?: string },
  ) {
    return this.channelsService.updateRoomMapping(id, body);
  }

  @Post(':hotelId/sync')
  triggerSync(@Param('hotelId') hotelId: string) {
    return this.channelsService.triggerSync(hotelId);
  }
}
