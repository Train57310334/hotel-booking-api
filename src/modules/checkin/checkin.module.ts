import { Module } from '@nestjs/common';
import { CheckinService } from './checkin.service';
import { CheckinController } from './checkin.controller';
import { PrismaService } from '@/common/prisma/prisma.service';

import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ActivityLogsModule, NotificationsModule],
  providers: [CheckinService, PrismaService],
  controllers: [CheckinController]
})
export class CheckinModule {}
