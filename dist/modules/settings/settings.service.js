"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let SettingsService = class SettingsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        const settings = await this.prisma.systemSetting.findMany();
        const dbSettings = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {});
        return {
            siteName: dbSettings['siteName'] || process.env.APP_NAME || 'BookingKub',
            logoUrl: dbSettings['logoUrl'] || '',
            stripeKey: dbSettings['stripeKey'] || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
            stripeSecret: dbSettings['stripeSecret'] || process.env.STRIPE_SECRET_KEY || '',
            omisePublicKey: dbSettings['omisePublicKey'] || process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY || '',
            omiseSecretKey: dbSettings['omiseSecretKey'] || process.env.OMISE_SECRET_KEY || '',
            smtpHost: dbSettings['smtpHost'] || process.env.SMTP_HOST || '',
            smtpPort: dbSettings['smtpPort'] || process.env.SMTP_PORT || '',
            smtpUser: dbSettings['smtpUser'] || process.env.SMTP_USER || '',
            smtpPass: dbSettings['smtpPass'] || process.env.SMTP_PASS || '',
            ...dbSettings
        };
    }
    async getPublicSettings() {
        const settings = await this.findAll();
        return {
            stripePublicKey: settings['stripeKey'] || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
            omisePublicKey: settings['omisePublicKey'] || process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY || '',
            siteName: settings['siteName'] || 'BookingKub',
            logoUrl: settings['logoUrl'] || '',
            landingHeroTitle: settings['landingHeroTitle'] || '',
            landingHeroDescription: settings['landingHeroDescription'] || '',
            landingCTA: settings['landingCTA'] || ''
        };
    }
    async updateBatch(settings) {
        const categories = {
            'siteName': 'general',
            'logoUrl': 'general',
            'contactEmail': 'general',
            'currency': 'general',
            'stripeKey': 'payment',
            'stripeSecret': 'payment',
            'omisePublicKey': 'payment',
            'omiseSecretKey': 'payment',
            'smtpHost': 'notification',
            'smtpPort': 'notification',
            'smtpUser': 'notification',
            'smtpPass': 'notification'
        };
        const promises = Object.entries(settings).map(([key, value]) => {
            return this.prisma.systemSetting.upsert({
                where: { key },
                update: { value },
                create: {
                    key,
                    value,
                    category: categories[key] || 'general'
                }
            });
        });
        await Promise.all(promises);
        return this.findAll();
    }
    async get(key, envFallback) {
        const setting = await this.prisma.systemSetting.findUnique({
            where: { key }
        });
        const value = setting?.value;
        if (value && value.trim() !== '')
            return value;
        return envFallback && process.env[envFallback] ? process.env[envFallback] : '';
    }
    async getStripeConfig() {
        const secretKey = await this.get('stripeSecret', 'STRIPE_SECRET_KEY');
        if (!secretKey)
            throw new Error('Stripe Secret Key is missing in both Settings and Environment Variables.');
        return { secretKey };
    }
    async getOmiseConfig() {
        const publicKey = await this.get('omisePublicKey', 'NEXT_PUBLIC_OMISE_PUBLIC_KEY');
        const secretKey = await this.get('omiseSecretKey', 'OMISE_SECRET_KEY');
        if (!publicKey || !secretKey) {
            throw new Error('Omise keys are missing in both Settings and Environment Variables.');
        }
        return { publicKey, secretKey };
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map