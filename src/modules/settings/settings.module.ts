import { Module, forwardRef } from '@nestjs/common';
import { SettingsController, PublicSettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [forwardRef(() => NotificationsModule)],
  controllers: [SettingsController, PublicSettingsController],
  providers: [SettingsService],
  exports: [SettingsService]
})
export class SettingsModule {}
