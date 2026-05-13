import { Controller, Get, Query, UseGuards, Req, Req as Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ActivityLogsService } from './activity-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Activity Logs')
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'owner', 'platform_admin') // High-Level staff + Super Admin can view logs
  @Get()
  @ApiOperation({ summary: 'Get activity logs with optional filtering' })
  async getLogs(
    @Query('hotelId') hotelId?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.activityLogsService.findLogs(hotelId, {
      action,
      userId,
      startDate,
      endDate,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
  }
}
