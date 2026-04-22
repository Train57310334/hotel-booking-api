import { Module } from '@nestjs/common';
import { HotelsService } from './hotels.service';
import { HotelsController } from './hotels.controller';
import { PaymentsModule } from '../payments/payments.module';
import { SubscriptionCronService } from './subscription-cron.service';

@Module({
  imports: [PaymentsModule],
  providers: [HotelsService, SubscriptionCronService],
  controllers: [HotelsController],
  exports: [HotelsService]
})
export class HotelsModule {}
