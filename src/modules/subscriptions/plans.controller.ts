import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('subscriptions/plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  // Publically accessible for the pricing page
  @Get()
  async findAll() {
    return this.plansService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('platform_admin')
  async create(@Body() data: any) {
    return this.plansService.create(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('platform_admin')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.plansService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('platform_admin')
  async delete(@Param('id') id: string) {
    return this.plansService.delete(id);
  }
}
