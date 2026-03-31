import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { IcalModule } from '../ical/ical.module';

@Module({
  imports: [IcalModule],
  controllers: [ChannelsController],
  providers: [ChannelsService, PrismaService],
  exports: [ChannelsService],
})
export class ChannelsModule {}
