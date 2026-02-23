import { PrismaService } from '../../common/prisma/prisma.service';
export declare class SettingsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<any>;
    getPublicSettings(): Promise<{
        stripePublicKey: any;
        omisePublicKey: any;
        siteName: any;
        logoUrl: any;
        landingHeroTitle: any;
        landingHeroDescription: any;
        landingCTA: any;
    }>;
    updateBatch(settings: Record<string, string>): Promise<any>;
    get(key: string, envFallback?: string): Promise<string>;
    getStripeConfig(): Promise<{
        secretKey: string;
    }>;
    getOmiseConfig(): Promise<{
        publicKey: string;
        secretKey: string;
    }>;
}
//# sourceMappingURL=settings.service.d.ts.map