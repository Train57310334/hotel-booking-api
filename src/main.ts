import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { SettingsService } from './modules/settings/settings.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // ─── CORS: load allowed origins from DB (UI-configurable) ────────────────
  // SettingsService reads from SystemSetting table first, then falls back to
  // the ALLOWED_ORIGINS env var if no DB record has been set yet.
  // Super Admins can update this at runtime via /admin/super/cms → Security tab
  // without needing to SSH into the server.
  //
  // NOTE: Changes to allowedOrigins in the DB take effect on the NEXT  
  // server restart (CORS is a bootstrap-time config, not per-request).
  const settingsService = app.get(SettingsService);
  const allowedOrigins = await settingsService.getCorsOrigins();
  app.enableCors({ origin: allowedOrigins, credentials: true });
  console.log(`🔒 CORS allowed origins: ${allowedOrigins.join(', ')}`);
  
  // Increase payload limit to 50MB for Base64 image uploads (Passports/Signatures)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  const config = new DocumentBuilder()
    .setTitle('Hotel Booking API')
    .setDescription('BookingKub Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3001);
  console.log('🚀 Application running on http://localhost:3001');
  console.log('📘 Swagger Docs: http://localhost:3001/api/docs');
}
bootstrap();