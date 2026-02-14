import { Module } from '@nestjs/common';
import { HotelsService } from './hotels.service';
import { HotelsController } from './hotels.controller';

import { PaymentsModule } from '../payments/payments.module'; // Add Import

@Module({
  imports: [PaymentsModule], // Add to imports
  providers: [HotelsService],
  controllers: [HotelsController],
  exports: [HotelsService]
})
export class HotelsModule {}
