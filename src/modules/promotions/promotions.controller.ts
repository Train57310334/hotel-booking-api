import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { Role } from '../roles/role.enum';

@ApiTags('promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post('validate')
  validate(@Body() body: { code: string; amount: number }) {
    return this.promotionsService.validateCode(body.code, body.amount);
  }

  // --- Admin Routes ---

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HotelAdmin, Role.PlatformAdmin)
  @Post()
  create(@Body() body) {
    return this.promotionsService.create(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HotelAdmin, Role.PlatformAdmin)
  @Get()
  findAll(@Query('hotelId') hotelId: string) {
    return this.promotionsService.findAll(hotelId);
  }

  @Roles(Role.HotelAdmin, Role.PlatformAdmin)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promotionsService.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HotelAdmin, Role.PlatformAdmin)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body) {
    return this.promotionsService.update(id, body);
  }
}
