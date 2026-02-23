import { ReportsService } from './reports.service';
export declare class ReportsController {
    private svc;
    constructor(svc: ReportsService);
    private getHotelId;
    revenue(req: any, from: string, to: string, hotelId?: string): Promise<{
        date: string;
        value: number;
    }[]>;
    expenses(req: any, from: string, to: string, hotelId?: string): Promise<{
        date: string;
        value: number;
    }[]>;
    occupancy(req: any, from: string, to: string, hotelId?: string): Promise<any[]>;
    sources(req: any, from: string, to: string, hotelId?: string): Promise<{
        name: string;
        value: number;
    }[]>;
    summary(req: any, from: string, to: string, hotelId?: string): Promise<{
        totalRevenue: number;
        totalExpenses: any;
        totalProfit: number;
        totalBookings: number;
    }>;
    dailyStats(): Promise<{
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
}
//# sourceMappingURL=reports.controller.d.ts.map