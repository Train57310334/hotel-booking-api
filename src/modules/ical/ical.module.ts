import { Module } from '@nestjs/common';
import { IcalController } from './ical.controller';
import { IcalService } from './ical.service';
import { PrismaService } from '@/common/prisma/prisma.service';

@Module({
  controllers: [IcalController],
  providers: [IcalService, PrismaService],
})
export class IcalModule {}
