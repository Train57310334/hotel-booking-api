import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    // Return key-value map or list
    const settings = await (this.prisma as any).systemSetting.findMany();
    
    // 1. Convert DB Settings to Map
    const dbSettings = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    // 2. Merge with Env Defaults (DB overrides Env)
    return {
        // General
        siteName: dbSettings['siteName'] || process.env.APP_NAME || 'BookingKub',
        logoUrl: dbSettings['logoUrl'] || '',
        
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
        
        // Spread rest
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
      // SaaS Landing Content
      landingHeroTitle: settings['landingHeroTitle'] || '',
      landingHeroDescription: settings['landingHeroDescription'] || '',
      landingCTA: settings['landingCTA'] || ''
    };
  }

  async updateBatch(settings: Record<string, string>) {
    const categories: Record<string, string> = {
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
      return (this.prisma as any).systemSetting.upsert({
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
  async get(key: string, envFallback?: string): Promise<string> {
    const setting = await (this.prisma as any).systemSetting.findUnique({
      where: { key }
    });
    const value = setting?.value;
    if (value && value.trim() !== '') return value;
    return envFallback && process.env[envFallback] ? process.env[envFallback] : '';
  }

  async getStripeConfig() {
    const secretKey = await this.get('stripeSecret', 'STRIPE_SECRET_KEY');
    if (!secretKey) throw new Error('Stripe Secret Key is missing in both Settings and Environment Variables.');
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
}
