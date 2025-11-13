import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService], // ✅ ต้องมี
  exports: [SearchService],   // (ถ้าใช้จาก module อื่น)
})
export class SearchModule {}
