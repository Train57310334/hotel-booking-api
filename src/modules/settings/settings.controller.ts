import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private svc: SettingsService) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Put()
  update(@Body() body: Record<string, string>) {
    return this.svc.updateBatch(body);
  }
}
