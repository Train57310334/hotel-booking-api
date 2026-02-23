import { PrismaService } from '../../common/prisma/prisma.service';
export declare class ExpensesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: {
        hotelId: string;
        title: string;
        amount: number;
        date: string;
        category?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string;
        title: string;
        amount: number;
        date: Date;
        category: string;
    }>;
    findAll(hotelId: string, from?: string, to?: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        hotelId: string;
        title: string;
        amount: number;
        date: Date;
        category: string;
    }[]>;
    update(id: string, data: any): Promise<{
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
//# sourceMappingURL=expenses.service.d.ts.map