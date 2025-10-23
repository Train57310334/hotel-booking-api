import { Module } from '@nestjs/common';
import { HotelsService } from './hotels.service';
import { HotelsController } from './hotels.controller';

@Module({
  providers: [HotelsService],
  controllers: [HotelsController],
  exports: [HotelsService]
})
export class HotelsModule {}
