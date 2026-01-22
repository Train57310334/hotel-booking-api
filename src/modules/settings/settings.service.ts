import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    // Return key-value map or list
    const settings = await (this.prisma as any).systemSetting.findMany();
    // Convert to object for easier consumption { 'siteName': 'My Hotel', ... }
    return settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
  }

  async updateBatch(settings: Record<string, string>) {
    const categories: Record<string, string> = {
      'siteNames': 'general', 
      'contactEmail': 'general',
      'currency': 'general',
      'stripeKey': 'payment',
      'smtpHost': 'notification'
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
}
