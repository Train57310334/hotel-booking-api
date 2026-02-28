import { Module } from '@nestjs/common';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

import { EventsModule } from '@/modules/events/events.module';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [RoomsController],
  providers: [RoomsService],
})
export class RoomsModule {}
