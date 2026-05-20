import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      // SECURITY: No fallback — main.ts validates JWT_SECRET on startup
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '24h' }, // Reduced from 7d for security
    }),
    NotificationsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtStrategy, RolesGuard],
  exports: [AuthService, JwtStrategy, JwtModule, RolesGuard],
})
export class AuthModule {}
