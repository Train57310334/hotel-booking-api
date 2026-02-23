import { SettingsService } from './settings.service';
export declare class SettingsController {
    private svc;
    constructor(svc: SettingsService);
    findAll(): Promise<any>;
    update(body: Record<string, string>): Promise<any>;
}
export declare class PublicSettingsController {
    private svc;
    constructor(svc: SettingsService);
    getPublic(): Promise<{
        stripePublicKey: any;
        omisePublicKey: any;
        siteName: any;
        logoUrl: any;
        landingHeroTitle: any;
        landingHeroDescription: any;
        landingCTA: any;
    }>;
}
//# sourceMappingURL=settings.controller.d.ts.map