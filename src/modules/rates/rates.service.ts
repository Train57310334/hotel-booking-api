import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RatesService {
  constructor(private prisma: PrismaService) {}
  // TODO: CRUD for rate plans and overrides
}
