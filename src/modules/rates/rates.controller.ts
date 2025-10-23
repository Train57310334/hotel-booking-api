import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('rates')
@Controller('rates')
export class RatesController {
  @Get()
  ping() { return { ok: true }; }
}
