import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { FolioService } from './folio.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('folio')
@ApiBearerAuth()
@Controller('folio')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FolioController {
  constructor(private svc: FolioService) {}

  @Get(':bookingId')
  @Roles('admin', 'owner', 'reception')
  getFolio(@Param('bookingId') bookingId: string) {
    return this.svc.getFolio(bookingId);
  }

  @Post(':bookingId/charges')
  @Roles('admin', 'owner', 'reception')
  addCharge(
    @Param('bookingId') bookingId: string,
    @Body() body: { amount: number; description: string; type?: string }
  ) {
    return this.svc.addCharge(bookingId, body);
  }

  @Delete('charges/:id')
  @Roles('admin', 'owner') // Only admin can void?
  removeCharge(@Param('id') id: string) {
    return this.svc.removeCharge(id);
  }
}
