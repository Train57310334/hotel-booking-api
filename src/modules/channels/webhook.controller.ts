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
    // In a real scenario, we'd validate the apiKey against our DB or Env
    // if (apiKey !== process.env.CHANNEX_WEBHOOK_SECRET) throw new UnauthorizedException();
    
    return this.channelsService.processWebhook(payload);
  }
}
