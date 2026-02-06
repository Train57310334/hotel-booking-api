import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner', 'admin')
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

@ApiTags('settings')
@Controller('public-settings')
export class PublicSettingsController {
  constructor(private svc: SettingsService) {}

  @Get()
  getPublic() {
    return this.svc.getPublicSettings();
  }
}
