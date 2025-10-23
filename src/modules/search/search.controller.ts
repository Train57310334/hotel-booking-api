import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('search')
@Controller('search')
export class SearchController {
  @Get('autocomplete')
  autocomplete(@Query('q') q: string) {
    return { q, suggestions: [] };
  }
}
