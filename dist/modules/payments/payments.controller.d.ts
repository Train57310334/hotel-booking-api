import { PaymentsService } from './payments.service';
export declare class PaymentsController {
    private svc;
    constructor(svc: PaymentsService);
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
    verify(id: string): Promise<{
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
    reject(id: string): Promise<{
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
    intent(body: {
        amount: number;
        currency?: string;
        description?: string;
        bookingId?: string;
    }): Promise<{
        clientSecret: string;
        id: string;
    }>;
    omiseCharge(body: {
        amount: number;
        token: string;
        description?: string;
    }): Promise<any>;
    capture(bookingId: string): {
        bookingId: string;
        status: string;
    };
    webhook(payload: any, signature: string): Promise<{
        received: boolean;
    }>;
    manualPayment(body: {
        bookingId: string;
        amount: number;
        method: 'CASH' | 'BANK_TRANSFER';
        reference?: string;
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
}
//# sourceMappingURL=payments.controller.d.ts.map