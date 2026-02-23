import { PrismaService } from '../../common/prisma/prisma.service';
export declare class SubscriptionsService {
    private prisma;
    constructor(prisma: PrismaService);
    upgradePackage(user: any, requestHotelId: string, newPackage: string): Promise<void>;
    handleSubscriptionPayment(hotelId: string, planId: string, amount: number, chargeId: string): Promise<void>;
    getAllPayments(): Promise<{
        payments: ({
            hotel: {
                name: string;
                contactEmail: string;
            };
        } & {
            id: string;
            createdAt: Date;
            hotelId: string;
            status: string;
            currency: string;
            provider: string;
            chargeId: string | null;
            amount: number;
            plan: string;
        })[];
        summary: {
            totalRevenue: number;
            currency: string;
            totalTransactions: number;
        };
    }>;
}
//# sourceMappingURL=subscriptions.service.d.ts.map