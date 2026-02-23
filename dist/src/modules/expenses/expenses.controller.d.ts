import { ExpensesService } from './expenses.service';
export declare class ExpensesController {
    private svc;
    constructor(svc: ExpensesService);
    create(req: any, body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string;
        date: Date;
        title: string;
        amount: number;
        category: string;
    }>;
    list(hotelId: string, from: string, to: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string;
        date: Date;
        title: string;
        amount: number;
        category: string;
    }[]>;
    update(id: string, body: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string;
        date: Date;
        title: string;
        amount: number;
        category: string;
    }>;
    delete(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string;
        date: Date;
        title: string;
        amount: number;
        category: string;
    }>;
}
//# sourceMappingURL=expenses.controller.d.ts.map