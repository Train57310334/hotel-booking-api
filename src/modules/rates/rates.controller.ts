import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { RatesService } from './rates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../roles/roles.guard';
import { Roles } from '../roles/roles.decorator';
import { Role } from '../roles/role.enum';

@ApiTags('rates')
@Controller('rates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @Roles(Role.HotelAdmin, Role.PlatformAdmin)
  @Post('plans')
  createPlan(@Body() body) {
      return this.ratesService.createRatePlan(body);
  }

  @Get('plans')
  getPlans(@Query('hotelId') hotelId: string) {
      return this.ratesService.getRatePlans(hotelId);
  }

  @Roles(Role.HotelAdmin, Role.PlatformAdmin)
  @Put('plans/:id')
  updatePlan(@Param('id') id: string, @Body() body) {
      return this.ratesService.updateRatePlan(id, body);
  }

  @Roles(Role.HotelAdmin, Role.PlatformAdmin)
  @Delete('plans/:id')
  deletePlan(@Param('id') id: string) {
      return this.ratesService.deleteRatePlan(id);
  }

  @Roles(Role.HotelAdmin, Role.PlatformAdmin)
  @Post('overrides')
  upsertOverride(@Body() body) {
      return this.ratesService.upsertOverride(body);
  }

  @Roles(Role.HotelAdmin, Role.PlatformAdmin)
  @Post('overrides/bulk')
  upsertOverrideBulk(@Body() body) {
      return this.ratesService.upsertOverrideBulk(body);
  }

  @Get('overrides')
  getOverrides(
      @Query('roomTypeId') roomTypeId: string,
      @Query('start') start: string,
      @Query('end') end: string
  ) {
      return this.ratesService.getOverrides(roomTypeId, start, end);
  }
}
