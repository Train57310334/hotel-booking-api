import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [PrismaModule, PromotionsModule],
  controllers: [PricingController],
  providers: [PricingService]
})
export class PricingModule {}
