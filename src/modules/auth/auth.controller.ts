import { Body, Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /** 🧾 ลงทะเบียนผู้ใช้ใหม่ */
  @Post('register')
  async register(@Body() body: { email: string; password: string; name?: string; phone?: string }) {
    return this.authService.register(body);
  }

  /** 🏨 ลงทะเบียนพาร์ทเนอร์ (เจ้าของโรงแรม) */
  @Post('register-partner')
  async registerPartner(@Body() body: { hotelName: string; email: string; password: string; name: string; phone?: string; package?: string }) {
    return this.authService.registerPartner(body);
  }

  /** 🔑 เข้าสู่ระบบ */
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body);
  }

  /** 👤 ดูข้อมูลโปรไฟล์ (ต้อง login) */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: any) {
    const profile = await this.authService.getProfile(req.user.userId);
    if (profile && req.user.roles) {
      // Use roles from the JWT context (handles impersonation stripping of platform_admin)
      profile.roles = req.user.roles;
      
      // If impersonating, the JWT contains a forced hotelId. Override DB roleAssignments globally
      if (req.user.hotelId) {
          (profile as any).roleAssignments = [{ hotelId: req.user.hotelId, role: 'hotel_admin' }];
      }
    }
    return profile;
  }

  /** 🕵️ เข้าสิงระบบลูกค้า (เฉพาะ Platform Admin) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('platform_admin')
  @Post('impersonate')
  async impersonate(@Body() body: { targetHotelId: string }) {
    return this.authService.impersonate(body.targetHotelId);
  }
}
