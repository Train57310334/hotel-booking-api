import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class MessagesService {
    private prisma;
    private notificationsService;
    constructor(prisma: PrismaService, notificationsService: NotificationsService);
    findAll(search?: string, hotelId?: string): Promise<any>;
    findOne(id: string): Promise<any>;
    create(data: any): Promise<any>;
    markAsRead(id: string): Promise<any>;
    reply(id: string, replyContent: string): Promise<any>;
    archive(id: string): Promise<any>;
    delete(id: string): Promise<any>;
}
//# sourceMappingURL=messages.service.d.ts.map