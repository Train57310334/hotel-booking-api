import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { StripeService } from './stripe.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module'; // Needed for role guards

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SubscriptionsController, PlansController],
  providers: [SubscriptionsService, PlansService, StripeService],
})
export class SubscriptionsModule {}
