import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  @Get('me')
  me(@Req() req: any) {
    // For demo: in real use, add JWT guard to populate req.user
    return { message: 'Attach JWT guard to get real profile', user: req.user ?? null };
  }
}
