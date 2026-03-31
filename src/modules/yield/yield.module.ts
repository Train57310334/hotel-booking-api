import { Module } from '@nestjs/common';
import { YieldController } from './yield.controller';
import { YieldService } from './yield.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [YieldController],
  providers: [YieldService],
  exports: [YieldService]
})
export class YieldModule {}
