import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const settings = await (this.prisma as any).systemSetting.findMany();
    
    const dbSettings = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    return {
        // General
        siteName: dbSettings['siteName'] || process.env.APP_NAME || 'BookingKub',
        logoUrl: dbSettings['logoUrl'] || '',
        authBgUrl: dbSettings['authBgUrl'] || '',
        
        // Payment Types (Stripe)
        stripeKey: dbSettings['stripeKey'] || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
        stripeSecret: dbSettings['stripeSecret'] || process.env.STRIPE_SECRET_KEY || '',
        
        // Payment Types (Omise)
        omisePublicKey: dbSettings['omisePublicKey'] || process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY || '',
        omiseSecretKey: dbSettings['omiseSecretKey'] || process.env.OMISE_SECRET_KEY || '',

        // Mail
        smtpHost: dbSettings['smtpHost'] || process.env.SMTP_HOST || '',
        smtpPort: dbSettings['smtpPort'] || process.env.SMTP_PORT || '',
        smtpUser: dbSettings['smtpUser'] || process.env.SMTP_USER || '',
        smtpPass: dbSettings['smtpPass'] || process.env.SMTP_PASS || '',
        smtpFromName: dbSettings['smtpFromName'] || process.env.SMTP_FROM_NAME || '',
        smtpFromEmail: dbSettings['smtpFromEmail'] || process.env.SMTP_FROM_EMAIL || '',

        // SEO & Marketing (Platform-wide)
        seoGoogleVerification: dbSettings['seoGoogleVerification'] || '',
        seoBingVerification: dbSettings['seoBingVerification'] || '',
        seoPlatformGaId: dbSettings['seoPlatformGaId'] || '',
        seoPlatformGtmId: dbSettings['seoPlatformGtmId'] || '',
        seoPlatformFbPixel: dbSettings['seoPlatformFbPixel'] || '',
        seoPlatformGadsId: dbSettings['seoPlatformGadsId'] || '',
        seoDefaultOgImage: dbSettings['seoDefaultOgImage'] || '',
        seoDefaultDescription: dbSettings['seoDefaultDescription'] || '',
        seoRobotsCustom: dbSettings['seoRobotsCustom'] || '',

        // ─── Platform Security (DB-managed, UI-configurable) ──────────────────
        // DB value takes precedence over environment variables.
        // This allows Super Admins to update security config via UI without SSH.
        allowedOrigins: dbSettings['allowedOrigins'] || process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
        mockPaymentEnabled: dbSettings['mockPaymentEnabled'] ?? process.env.ALLOW_MOCK_PAYMENT ?? 'false',

        // ─── Infrastructure (DB-managed) ──────────────────────────────────────
        redisUrl: dbSettings['redisUrl'] || process.env.REDIS_URL || '',
        redisCacheTtl: dbSettings['redisCacheTtl'] || '300', // seconds, default 5 minutes
        
        // Spread rest (catch-all for any other custom settings)
        ...dbSettings
    };
  }

  async getPublicSettings() {
    const settings = await this.findAll();
    return {
      stripePublicKey: settings['stripeKey'] || process.env.STRIPE_PUBLIC_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
      omisePublicKey: settings['omisePublicKey'] || process.env.OMISE_PUBLIC_KEY || process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY || '',
      siteName: settings['siteName'] || 'BookingKub',
      logoUrl: settings['logoUrl'] || '',
      authBgUrl: settings['authBgUrl'] || '',
      landingHeroTitle: settings['landingHeroTitle'] || '',
      landingHeroDescription: settings['landingHeroDescription'] || '',
      landingCTA: settings['landingCTA'] || '',
      landingFeaturesTitle: settings['landingFeaturesTitle'] || '',
      landingFeaturesSubtitle: settings['landingFeaturesSubtitle'] || '',
      landingPricingTitle: settings['landingPricingTitle'] || '',
      landingPricingSubtitle: settings['landingPricingSubtitle'] || '',
      seoGoogleVerification: settings['seoGoogleVerification'] || '',
      seoBingVerification: settings['seoBingVerification'] || '',
      seoPlatformGaId: settings['seoPlatformGaId'] || '',
      seoPlatformGtmId: settings['seoPlatformGtmId'] || '',
      seoPlatformFbPixel: settings['seoPlatformFbPixel'] || '',
      seoPlatformGadsId: settings['seoPlatformGadsId'] || '',
      seoDefaultOgImage: settings['seoDefaultOgImage'] || '',
      seoDefaultDescription: settings['seoDefaultDescription'] || '',
      seoRobotsCustom: settings['seoRobotsCustom'] || ''
    };
  }

  async updateBatch(settings: Record<string, string>) {
    const categories: Record<string, string> = {
      'siteName': 'general', 
      'logoUrl': 'general',
      'authBgUrl': 'general',
      'contactEmail': 'general',
      'currency': 'general',
      'stripeKey': 'payment',
      'stripeSecret': 'payment',
      'omisePublicKey': 'payment',
      'omiseSecretKey': 'payment',
      'smtpHost': 'notification',
      'smtpPort': 'notification',
      'smtpUser': 'notification',
      'smtpPass': 'notification',
      'smtpFromName': 'notification',
      'smtpFromEmail': 'notification',
      'landingHeroTitle': 'general',
      'landingHeroDescription': 'general',
      'landingCTA': 'general',
      'landingFeaturesTitle': 'general',
      'landingFeaturesSubtitle': 'general',
      'landingPricingTitle': 'general',
      'landingPricingSubtitle': 'general',
      'seoGoogleVerification': 'seo',
      'seoBingVerification': 'seo',
      'seoPlatformGaId': 'seo',
      'seoPlatformGtmId': 'seo',
      'seoPlatformFbPixel': 'seo',
      'seoPlatformGadsId': 'seo',
      'seoDefaultOgImage': 'seo',
      'seoDefaultDescription': 'seo',
      'seoRobotsCustom': 'seo',
      // Platform Security — UI-settable keys
      'allowedOrigins': 'security',
      'mockPaymentEnabled': 'security',
      // Infrastructure — UI-settable keys
      'redisUrl': 'infrastructure',
      'redisCacheTtl': 'infrastructure',
    };

    const promises = Object.entries(settings).map(([key, value]) => {
      return (this.prisma as any).systemSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value, category: categories[key] || 'general' }
      });
    });

    await Promise.all(promises);
    return this.findAll();
  }

  async get(key: string, envFallback?: string): Promise<string> {
    const setting = await (this.prisma as any).systemSetting.findUnique({ where: { key } });
    const value = setting?.value;
    if (value && value.trim() !== '') return value;
    return envFallback && process.env[envFallback] ? process.env[envFallback] : '';
  }

  // ─── Platform Security Helpers ─────────────────────────────────────────────

  /**
   * Returns parsed list of allowed CORS origins.
   * Reads from DB first; env var ALLOWED_ORIGINS is the fallback.
   * Called at bootstrap in main.ts.
   */
  async getCorsOrigins(): Promise<string[]> {
    const raw = await this.get('allowedOrigins', 'ALLOWED_ORIGINS');
    return (raw || 'http://localhost:3000')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean);
  }

  /**
   * Returns true if mock payment checkout is enabled.
   * DB value wins over env. Always false in production unless explicitly 'true' in DB.
   */
  async isMockPaymentEnabled(): Promise<boolean> {
    const value = await this.get('mockPaymentEnabled', 'ALLOW_MOCK_PAYMENT');
    if (process.env.NODE_ENV === 'production' && value !== 'true') return false;
    return value === 'true';
  }

  // ─── Payment Gateway Configs ───────────────────────────────────────────────

  async getStripeConfig() {
    const secretKey = await this.get('stripeSecret', 'STRIPE_SECRET_KEY');
    if (!secretKey) throw new Error('Stripe Secret Key is missing in Settings and Environment Variables.');
    return { secretKey };
  }

  async getOmiseConfig() {
    const publicKey = await this.get('omisePublicKey', 'NEXT_PUBLIC_OMISE_PUBLIC_KEY');
    const secretKey = await this.get('omiseSecretKey', 'OMISE_SECRET_KEY');
    if (!publicKey || !secretKey) throw new Error('Omise keys are missing in Settings and Environment Variables.');
    return { publicKey, secretKey };
  }
  async getRedisConfig(): Promise<{ url: string; cacheTtlSeconds: number }> {
    const url = await this.get('redisUrl', 'REDIS_URL');
    const ttl = await this.get('redisCacheTtl');
    return {
      url: url || '',
      cacheTtlSeconds: ttl ? parseInt(ttl, 10) : 300,
    };
  }
}
