import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import helmet from 'helmet';
import { SettingsService } from './modules/settings/settings.service';

async function bootstrap() {
  // ─── SECURITY: Fail fast if critical secrets are missing ──────────────────
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret === 'change_this_secret_key' || jwtSecret === 'secret') {
    console.error('🚨 FATAL: JWT_SECRET is not set or is using an insecure default value.');
    console.error('   Please set a strong, unique JWT_SECRET in your .env file (min 32 chars).');
    console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, { rawBody: true });
  
  app.setGlobalPrefix('api');

  // ─── SECURITY: Helmet — HTTP security headers ────────────────────────────
  // Sets X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security,
  // Content-Security-Policy, and other protective headers automatically.
  app.use(helmet({
    contentSecurityPolicy: false, // Disabled to allow Swagger UI and frontend embeds
    crossOriginEmbedderPolicy: false,
  }));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // ─── CORS: load allowed origins from DB (UI-configurable) ────────────────
  // SettingsService reads from SystemSetting table first, then falls back to
  // the ALLOWED_ORIGINS env var, then to production defaults.
  // Super Admins can update this at runtime via /admin/super/cms → Security tab
  // without needing to SSH into the server.
  //
  // NOTE: Changes to allowedOrigins in the DB take effect on the NEXT
  // server restart (CORS is a bootstrap-time config, not per-request).
  const settingsService = app.get(SettingsService);
  const allowedOrigins = await settingsService.getCorsOrigins();

  // ─── SECURITY: Block wildcard CORS ────────────────────────────────────────
  const safeOrigins = allowedOrigins.filter(o => o !== '*');
  if (safeOrigins.length === 0) {
    console.warn('⚠️  No valid CORS origins configured (wildcard "*" is blocked). Defaulting to localhost.');
    safeOrigins.push('http://localhost:3000');
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (safeOrigins.includes(origin)) return callback(null, true);
      console.warn(`🚫 CORS blocked origin: ${origin}`);
      return callback(new Error(`CORS: origin ${origin} is not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'x-hotel-id'],
  });
  console.log(`🔒 CORS allowed origins: ${safeOrigins.join(', ')}`);
  
  // ─── Raw body for Stripe webhook signature verification ───────────────────
  // IMPORTANT: The Stripe webhook endpoint MUST receive the raw body bytes.
  // We apply express.raw() ONLY to the webhook route BEFORE the global json()
  // parser so that req.rawBody is populated correctly by NestJS's rawBody:true.
  // All other routes use the standard json() parser with a 50MB limit.
  app.use(
    '/api/subscriptions/webhook',
    express.raw({ type: 'application/json' })
  );

  // Increase payload limit to 50MB for Base64 image uploads (Passports/Signatures)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ─── SECURITY: Only expose Swagger docs in non-production environments ───
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Hotel Booking API')
      .setDescription('BookingKub Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    console.log('📘 Swagger Docs: http://localhost:3001/api/docs');
  }

  await app.listen(process.env.PORT || 3001);
  console.log('🚀 Application running on http://localhost:3001');
}
bootstrap();