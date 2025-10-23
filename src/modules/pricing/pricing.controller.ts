import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

class PricingDto {
  hotelId: string;
  roomTypeId: string;
  ratePlanId: string;
  checkIn: string;
  checkOut: string;
  promoCode?: string;
}
@ApiTags('pricing')
@Controller('pricing')
export class PricingController {
  @Post('calculate')
  calc(@Body() dto: PricingDto) {
    // TODO: Real calculation: join rate_overrides + promotions + taxes
    return {
      nights: [], subtotal: 0, discount: null, taxesAndFees: 0, total: 0, currency: 'THB'
    };
  }
}
