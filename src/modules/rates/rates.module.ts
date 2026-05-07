import { Module } from '@nestjs/common';
import { RatesController } from './rates.controller';
import { RatesService } from './rates.service';
import { ChannelsModule } from '@/modules/channels/channels.module';

@Module({
  imports: [ChannelsModule],
  controllers: [RatesController],
  providers: [RatesService],
  exports: [RatesService]
})
export class RatesModule {}
