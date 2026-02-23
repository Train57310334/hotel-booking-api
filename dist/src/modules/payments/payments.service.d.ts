import { PrismaService } from '../../common/prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class PaymentsService {
    private prisma;
    private settingsService;
    private notificationsService;
    constructor(prisma: PrismaService, settingsService: SettingsService, notificationsService: NotificationsService);
    findAll(search?: string, status?: string): Promise<{
        id: any;
        bookingId: any;
        amount: number;
        provider: string;
        method: string;
        status: string;
        date: any;
        reference: any;
        booking: any;
        isManual: boolean;
    }[]>;
    createPaymentIntent(amount: number, currency?: string, description?: string, bookingId?: string): Promise<{
        clientSecret: string;
        id: string;
    }>;
    createOmiseCharge(amount: number, token: string, description?: string, bookingId?: string): Promise<any>;
    updateStatus(id: string, status: 'captured' | 'failed'): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: string;
        currency: string;
        bookingId: string;
        provider: string;
        intentId: string | null;
        chargeId: string | null;
        amount: number;
        method: string | null;
    }>;
    createUpgradeIntent(hotelId: string): Promise<{
        clientSecret: string;
        id: string;
    }>;
    handleWebhook(signature: string, payload: Buffer): Promise<{
        received: boolean;
    }>;
    createManualPayment(bookingId: string, amount: number, method: 'CASH' | 'BANK_TRANSFER', reference?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        date: Date;
        type: string;
        bookingId: string;
        amount: number;
        createdBy: string | null;
    }>;
}
//# sourceMappingURL=payments.service.d.ts.map