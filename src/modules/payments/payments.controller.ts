import { Body, Controller, Param, Post, Get, Query, UseGuards, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private svc: PaymentsService) {}

  // SECURITY FIX: Added RolesGuard — was accessible to any logged-in user
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin', 'reception', 'platform_admin')
  @Get('admin/all')
  findAll(@Req() req: any, @Query('search') search?: string, @Query('status') status?: string, @Query('hotelId') hotelId?: string) {
    const resolvedHotelId = hotelId || req.headers['x-hotel-id'];
    return this.svc.findAll(resolvedHotelId, search, status);
  }

  // SECURITY FIX: Added RolesGuard — any user could verify/reject payments
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin', 'platform_admin')
  @Post(':id/verify')
  verify(@Param('id') id: string) {
    return this.svc.updateStatus(id, 'captured');
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin', 'platform_admin')
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

  @Post('omise/promptpay')
  async omisePromptPay(@Body() body: { amount: number; description?: string; bookingId: string }) {
    if (!body.amount || !body.bookingId) throw new Error('Amount and BookingId are required');
    return this.svc.createOmisePromptPaySource(body.amount, body.bookingId, body.description);
  }

  // SECURITY FIX: Omise webhook — validate source IP or add basic security check
  // Full signature verification requires Omise's webhook signing feature
  @Post('omise/webhook')
  async omiseWebhook(@Body() payload: any, @Req() req: any) {
    // SECURITY: Log webhook origin for audit trail
    const sourceIp = req.ip || req.connection?.remoteAddress;
    console.log(`📨 Omise webhook received from IP: ${sourceIp}`);
    
    // TODO: Implement Omise webhook signature verification when available
    // For now, at minimum validate payload structure
    if (!payload || !payload.key || !payload.data) {
      console.warn('⚠️ Omise webhook: Invalid payload structure');
      return { received: false, error: 'Invalid payload' };
    }

    return this.svc.handleOmiseWebhook(payload);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin', 'reception', 'platform_admin')
  @Post('manual')
  async manualPayment(@Body() body: { bookingId: string; amount: number; method: 'CASH' | 'BANK_TRANSFER'; reference?: string }) {
    if (!body.bookingId || !body.amount || !body.method) throw new Error('Missing required fields');
    return this.svc.createManualPayment(body.bookingId, body.amount, body.method, body.reference);
  }
}
