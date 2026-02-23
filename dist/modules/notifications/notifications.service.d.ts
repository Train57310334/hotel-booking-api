import { PrismaService } from '../../common/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
export declare class NotificationsService {
    private prisma;
    private settingsService;
    private readonly logger;
    constructor(prisma: PrismaService, settingsService: SettingsService);
    createNotification(title: string, message: string, type?: string): Promise<void>;
    sendBookingConfirmationEmail(booking: any): Promise<void>;
    sendPaymentSuccessEmail(booking: any): Promise<void>;
    sendCancellationEmail(booking: any): Promise<void>;
    sendPreCheckinReminder(booking: any): Promise<void>;
    sendFeedbackRequest(booking: any): Promise<void>;
    private getTransporter;
    private sendEmail;
    private formatDate;
    private templateBookingConfirmation;
    private templatePaymentSuccess;
    private templateCancellation;
    private templatePreCheckin;
    private templateFeedbackRequest;
}
//# sourceMappingURL=notifications.service.d.ts.map