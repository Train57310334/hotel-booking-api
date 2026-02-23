import { PrismaService } from '../../common/prisma/prisma.service';
export declare class FolioService {
    private prisma;
    constructor(prisma: PrismaService);
    getFolio(bookingId: string): Promise<{
        bookingId: string;
        currency: string;
        roomTotal: number;
        totalCharges: number;
        totalPaid: number;
        balance: number;
        charges: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            type: string;
            bookingId: string;
            amount: number;
            date: Date;
            createdBy: string | null;
        }[];
        transactions: ({
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
        } | {
            id: string;
            date: Date;
            amount: number;
            method: string;
            status: string;
            isManual: boolean;
            description: string;
        })[];
    }>;
    addCharge(bookingId: string, data: {
        amount: number;
        description: string;
        type?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        type: string;
        bookingId: string;
        amount: number;
        date: Date;
        createdBy: string | null;
    }>;
    removeCharge(chargeId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        type: string;
        bookingId: string;
        amount: number;
        date: Date;
        createdBy: string | null;
    }>;
}
//# sourceMappingURL=folio.service.d.ts.map