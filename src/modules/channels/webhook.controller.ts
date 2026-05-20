import { Controller, Post, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChannelsService } from './channels.service';

@ApiTags('webhooks')
@Controller('webhooks/channel-manager')
export class ChannelManagerWebhookController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-api-key') apiKey: string,
  ) {
    // SECURITY FIX: Validate API key against environment variable
    // Set CHANNEX_WEBHOOK_SECRET in .env to enable webhook authentication
    const expectedKey = process.env.CHANNEX_WEBHOOK_SECRET;
    if (expectedKey && apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid webhook API key');
    }
    if (!expectedKey) {
      console.warn('⚠️ CHANNEX_WEBHOOK_SECRET is not set — channel manager webhooks are unprotected!');
    }
    
    return this.channelsService.processWebhook(payload);
  }
}
