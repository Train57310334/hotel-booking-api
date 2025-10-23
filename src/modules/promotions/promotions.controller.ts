import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('promotions')
@Controller('promotions')
export class PromotionsController {
  @Post('validate')
  validate(@Body() body: any) {
    // TODO: validate code by date and conditions
    return { valid: true, code: body.code, discount: { type: 'percent', value: 10 } };
  }
}
