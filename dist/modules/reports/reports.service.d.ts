import { PrismaService } from '../../common/prisma/prisma.service';
export declare class ReportsService {
    private prisma;
    constructor(prisma: PrismaService);
    getRevenue(hotelId: string, from: Date, to: Date): Promise<{
        date: string;
        value: number;
    }[]>;
    getExpenses(hotelId: string, from: Date, to: Date): Promise<{
        date: string;
        value: number;
    }[]>;
    getOccupancy(hotelId: string, from: Date, to: Date): Promise<any[]>;
    getBookingSources(hotelId: string, from: Date, to: Date): Promise<{
        name: string;
        value: number;
    }[]>;
    getSummary(hotelId: string, from: Date, to: Date): Promise<{
        totalRevenue: number;
        totalExpenses: any;
        totalProfit: number;
        totalBookings: number;
    }>;
    getDefaultHotelId(): Promise<string>;
    getDailyStats(): Promise<{
        id: string;
        createdAt: Date;
        date: Date;
        totalRevenue: number;
        totalBookings: number;
        occupiedRooms: number;
        occupancyRate: number;
        adr: number;
        revPar: number;
    }[]>;
    exportToCsv(hotelId: string, from: Date, to: Date): Promise<string>;
    exportToExcel(hotelId: string, from: Date, to: Date): Promise<Buffer>;
}
//# sourceMappingURL=reports.service.d.ts.map