import { Body, Controller, Get, Post, Put, UseGuards, Request, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('platform_admin')
export class SettingsController {
  constructor(
    private svc: SettingsService,
    @Inject(forwardRef(() => NotificationsService))
    private notifications: NotificationsService,
  ) {}

  @Get()
  findAll() {
    return this.svc.findAll();
  }

  @Put()
  update(@Body() body: Record<string, string>) {
    return this.svc.updateBatch(body);
  }

  @Post('test-email')
  async testEmail(@Body() body: { to?: string }, @Request() req) {
    const toEmail = body.to || req.user?.email;
    if (!toEmail) throw new BadRequestException('Target email address is required.');
    await this.notifications.sendTestEmail(toEmail);
    return { success: true, message: `Test email sent to ${toEmail}` };
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
