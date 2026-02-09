import { Controller, Get, Req, UseGuards, Query, Put, Body, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private svc: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('search') search?: string, @Query('hotelId') hotelId?: string) {
    return this.svc.findAll(search, hotelId);
  }
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return this.svc.me(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMe(@Req() req: any, @Body() body: any) {
    // Whitelist allowed fields for self-update
    const allowed = ['name', 'phone', 'avatarUrl'];
    const updates = {};
    for (const key of allowed) {
        if (body[key] !== undefined) updates[key] = body[key];
    }
    return this.svc.update(req.user.userId, updates);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/change-password')
  async changePassword(@Req() req: any, @Body() body: any) {
    return this.svc.changePassword(req.user.userId, body.currentPassword, body.newPassword);
  }

  // Admin Endpoints
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner')
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }
}
