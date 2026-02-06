import { Module } from '@nestjs/common';
import { NightAuditService } from './night-audit.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [NightAuditService],
  exports: [NightAuditService],
})
export class NightAuditModule {}
