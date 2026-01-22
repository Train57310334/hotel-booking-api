import { Body, Controller, Param, Post, Get, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private svc: PaymentsService) {}

  @Get('admin/all')
  findAll(@Query('search') search?: string, @Query('status') status?: string) {
    return this.svc.findAll(search, status);
  }

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
