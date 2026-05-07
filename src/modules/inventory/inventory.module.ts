import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ChannelsModule } from '@/modules/channels/channels.module';

@Module({
  imports: [ChannelsModule],
  controllers: [InventoryController],
  providers: [InventoryService, PrismaService],
  exports: [InventoryService], // ✅ ให้ module อื่นใช้ได้
})
export class InventoryModule {}
