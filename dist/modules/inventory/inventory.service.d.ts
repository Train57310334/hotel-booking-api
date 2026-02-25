import { PrismaService } from '@/common/prisma/prisma.service';
export declare class InventoryService {
    private prisma;
    constructor(prisma: PrismaService);
    getInventoryByRoomType(roomTypeId: string, startDate: string, endDate: string): Promise<{
        id: string;
        roomTypeId: string;
        date: Date;
        allotment: number;
        stopSale: boolean;
        minStay: number;
    }[]>;
    updateInventory(roomTypeId: string, date: string, data: {
        allotment?: number;
        stopSale?: boolean;
        minStay?: number;
    }): Promise<{
        id: string;
        roomTypeId: string;
        date: Date;
        allotment: number;
        stopSale: boolean;
        minStay: number;
    }>;
    updateBulk(roomTypeId: string, startDate: string, endDate: string, data: {
        allotment?: number;
        stopSale?: boolean;
        minStay?: number;
    }): Promise<{
        id: string;
        roomTypeId: string;
        date: Date;
        allotment: number;
        stopSale: boolean;
        minStay: number;
    }[]>;
    reduceInventory(roomTypeId: string, dateRange: Date[], tx?: any): Promise<void>;
    checkAvailability(roomTypeId: string, startDate: string, endDate: string): Promise<boolean>;
}
//# sourceMappingURL=inventory.service.d.ts.map