import { PrismaService } from '@/common/prisma/prisma.service';
export declare class GuestsService {
    private prisma;
    constructor(prisma: PrismaService);
    addGuest(data: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        bookingId: string;
        idType: string;
        idNumber: string | null;
        documentUrl: string | null;
    }>;
    removeGuest(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        bookingId: string;
        idType: string;
        idNumber: string | null;
        documentUrl: string | null;
    }>;
}
//# sourceMappingURL=guests.service.d.ts.map