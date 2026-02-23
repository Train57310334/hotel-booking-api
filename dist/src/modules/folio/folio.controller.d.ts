import { FolioService } from './folio.service';
export declare class FolioController {
    private svc;
    constructor(svc: FolioService);
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
            date: Date;
            type: string;
            bookingId: string;
            amount: number;
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
    addCharge(bookingId: string, body: {
        amount: number;
        description: string;
        type?: string;
    }): Promise<{
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
    removeCharge(id: string): Promise<{
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
//# sourceMappingURL=folio.controller.d.ts.map