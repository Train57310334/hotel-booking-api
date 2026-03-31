import { Module } from '@nestjs/common';
import { StaffController } from './staff.controller';
import { StaffService } from './staff.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [PrismaModule, ActivityLogsModule],
  controllers: [StaffController],
  providers: [StaffService]
})
export class StaffModule {}
