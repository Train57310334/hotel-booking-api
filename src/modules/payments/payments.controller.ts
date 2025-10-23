import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  @Post('intent')
  intent(@Body() body: any) {
    // TODO: Integrate with Omise/Stripe - create payment intent
    return { provider: 'mock', intentId: 'pi_123', clientSecret: 'secret_abc' };
  }

  @Post(':bookingId/capture')
  capture(@Param('bookingId') bookingId: string) {
    return { bookingId, status: 'captured' };
  }

  @Post('webhook')
  webhook(@Body() payload: any) {
    // TODO: verify signature
    return { received: true };
  }
}
