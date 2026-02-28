import { PrismaService } from '@/common/prisma/prisma.service';
export declare class IcalService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    generateIcal(hotelId: string): Promise<string>;
    syncExternalIcal(): Promise<void>;
}
//# sourceMappingURL=ical.service.d.ts.map