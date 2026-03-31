import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger(ActivityLogsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Logs an action to the database.
   * If userId is not provided, it's considered a SYSTEM action.
   */
  async logAction(
    hotelId: string,
    action: string,
    details?: any,
    userId?: string,
    ipAddress?: string
  ) {
    try {
      let userName = 'SYSTEM';
      let userEmail = 'system@bookingkub.com';

      if (userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, email: true },
        });
        if (user) {
          userName = user.name || 'Unknown User';
          userEmail = user.email;
        }
      }

      await this.prisma.activityLog.create({
        data: {
          hotelId,
          userId,
          userName,
          userEmail,
          action,
          details: details ? details : undefined,
          ipAddress,
        },
      });
    } catch (error) {
      // We don't want logging errors to break the main transaction/flow
      this.logger.error(`Failed to create activity log: ${error.message}`);
    }
  }

  /**
   * Fetch logs for a hotel with pagination and filtering
   */
  async findLogs(hotelId: string | undefined, filterDto: any) {
    const { action, userId, startDate, endDate, skip = 0, take = 50 } = filterDto;

    const where: any = {};
    if (hotelId) where.hotelId = hotelId;

    if (action) where.action = action;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(take),
        skip: Number(skip),
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      items,
      total,
      page: Math.floor(skip / take) + 1,
      totalPages: Math.ceil(total / take),
    };
  }
}
