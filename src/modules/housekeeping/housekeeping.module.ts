import { Module } from '@nestjs/common';
import { HousekeepingController } from './housekeeping.controller';
import { HousekeepingService } from './housekeeping.service';
import { PrismaService } from '@/common/prisma/prisma.service';

@Module({
  controllers: [HousekeepingController],
  providers: [HousekeepingService, PrismaService],
})
export class HousekeepingModule {}
