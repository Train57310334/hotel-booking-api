import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from '@/modules/roles/roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'change_this_secret_key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtStrategy, RolesGuard],
  exports: [AuthService, JwtStrategy],
})
export class AuthModule {}
