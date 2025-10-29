import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { PrismaService } from '@/common/prisma/prisma.service';

@Module({
  controllers: [InventoryController],
  providers: [InventoryService, PrismaService],
  exports: [InventoryService], // ✅ ให้ module อื่นใช้ได้
})
export class InventoryModule {}
