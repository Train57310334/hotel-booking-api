import { Controller, Get, Req, UseGuards, Query, Put, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private svc: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('search') search?: string) {
    return this.svc.findAll(search);
  }
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: any) {
    return this.svc.me(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMe(@Req() req: any, @Body() body: any) {
    return this.svc.update(req.user.userId, body);
  }
}
