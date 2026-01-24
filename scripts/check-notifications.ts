import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

async function checkNotifications() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const prisma = app.get(PrismaService);

  const count = await prisma.notification.count();
  console.log(`Total Notifications in DB: ${count}`);

  const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
  });
  console.log('Latest 5 Notifications:', notifications);

  await app.close();
}

checkNotifications();
