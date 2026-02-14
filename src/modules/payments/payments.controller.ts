import { Body, Controller, Param, Post, Get, Query, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private svc: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('admin/all')
  findAll(@Query('search') search?: string, @Query('status') status?: string) {
    return this.svc.findAll(search, status);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/verify')
  verify(@Param('id') id: string) {
    return this.svc.updateStatus(id, 'captured');
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post(':id/reject')
  reject(@Param('id') id: string) {
    return this.svc.updateStatus(id, 'failed');
  }

  @Post('intent')
  async intent(@Body() body: { amount: number; currency?: string; description?: string; bookingId?: string }) {
    if (!body.amount) throw new Error('Amount is required');
    
    return this.svc.createPaymentIntent(body.amount, body.currency, body.description, body.bookingId);
  }

  @Post('omise/charge')
  async omiseCharge(@Body() body: { amount: number; token: string; description?: string }) {
    if (!body.amount || !body.token) throw new Error('Amount and Token are required');
    return this.svc.createOmiseCharge(body.amount, body.token, body.description);
  }

  @Post(':bookingId/capture')
  capture(@Param('bookingId') bookingId: string) {
    return { bookingId, status: 'captured' };
  }

  @Post('webhook')
  async webhook(@Body() payload: any, @Query('signature') signature: string) { // Signature usually in header, but for simplicity
    // In real NestJS, we need RawBody for Stripe signature verification. 
    // Here we pass the parsed body for MVP logic in service. 
    // Ideally: use RawBody middleware.
    
    // For now, passing JSON string buffer to mimic raw body if needed, or just pass payload
    return this.svc.handleWebhook(signature, Buffer.from(JSON.stringify(payload)));
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('manual')
  async manualPayment(@Body() body: { bookingId: string; amount: number; method: 'CASH' | 'BANK_TRANSFER'; reference?: string }) {
    if (!body.bookingId || !body.amount || !body.method) throw new Error('Missing required fields');
    return this.svc.createManualPayment(body.bookingId, body.amount, body.method, body.reference);
  }
}
