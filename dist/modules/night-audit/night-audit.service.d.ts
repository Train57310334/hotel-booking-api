import { PrismaService } from '@/common/prisma/prisma.service';
export declare class NightAuditService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    handleNightAudit(): Promise<void>;
    autoMarkNoShow(): Promise<void>;
    generateDailySnapshot(): Promise<void>;
    databaseCleanup(): Promise<void>;
}
//# sourceMappingURL=night-audit.service.d.ts.map