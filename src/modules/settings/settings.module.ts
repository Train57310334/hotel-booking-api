import { Module } from '@nestjs/common';
import { SettingsController, PublicSettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController, PublicSettingsController],
  providers: [SettingsService],
  exports: [SettingsService]
})
export class SettingsModule {}
