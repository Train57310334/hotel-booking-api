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
  async intent(@Body() body: { amount: number; currency?: string; description?: string }) {
    if (!body.amount) throw new Error('Amount is required');
    
    return this.svc.createPaymentIntent(body.amount, body.currency, body.description);
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
