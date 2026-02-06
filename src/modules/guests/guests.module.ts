import { Module } from '@nestjs/common';
import { GuestsService } from './guests.service';
import { GuestsController } from './guests.controller';
import { PrismaService } from '@/common/prisma/prisma.service';

@Module({
  controllers: [GuestsController],
  providers: [GuestsService, PrismaService],
})
export class GuestsModule {}
