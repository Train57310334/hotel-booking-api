import { PrismaService } from '../../common/prisma/prisma.service';
export declare class AvailabilityService {
    private prisma;
    constructor(prisma: PrismaService);
    check(hotelId: string, checkIn: Date, checkOut: Date): Promise<{
        roomTypeId: string;
        availableAllotment: number;
        minStay: number;
        stopSale: boolean;
        ratePlans: any[];
    }[]>;
}
//# sourceMappingURL=availability.service.d.ts.map