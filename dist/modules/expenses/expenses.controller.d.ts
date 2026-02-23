import { ExpensesService } from './expenses.service';
export declare class ExpensesController {
    private svc;
    constructor(svc: ExpensesService);
    create(req: any, body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string;
        title: string;
        amount: number;
        date: Date;
        category: string;
    }>;
    list(hotelId: string, from: string, to: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string;
        title: string;
        amount: number;
        date: Date;
        category: string;
    }[]>;
    update(id: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string;
        title: string;
        amount: number;
        date: Date;
        category: string;
    }>;
    delete(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string;
        title: string;
        amount: number;
        date: Date;
        category: string;
    }>;
}
//# sourceMappingURL=expenses.controller.d.ts.map