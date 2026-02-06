import { Body, Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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
  async registerPartner(@Body() body: { hotelName: string; email: string; password: string; name: string; phone?: string }) {
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
    return this.authService.getProfile(req.user.userId);
  }
}
