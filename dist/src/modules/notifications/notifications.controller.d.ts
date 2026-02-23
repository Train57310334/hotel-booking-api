import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Request as ExpressRequest } from 'express';
export declare class NotificationsController {
    private readonly notificationsService;
    private readonly prisma;
    constructor(notificationsService: NotificationsService, prisma: PrismaService);
    getNotifications(req: ExpressRequest & {
        user: any;
    }): Promise<{
        time: string;
        id: string;
        createdAt: Date;
        userId: string | null;
        type: string;
        message: string;
        title: string;
        isRead: boolean;
    }[]>;
    triggerTest(): Promise<{
        success: boolean;
    }>;
    private timeAgo;
    markAsRead(id: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string | null;
        type: string;
        message: string;
        title: string;
        isRead: boolean;
    }>;
    markAllAsRead(req: ExpressRequest & {
        user: any;
    }): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
//# sourceMappingURL=notifications.controller.d.ts.map