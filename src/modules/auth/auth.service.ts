import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private users: UsersService, private jwt: JwtService) {}

  async register(email: string, password: string, name?: string) {
    const hash = await argon2.hash(password);
    const user = await this.users.create({ email, passwordHash: hash, name });
    return this.sign(user.id, user.email);
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.sign(user.id, user.email);
  }

  private sign(sub: string, email: string) {
    const access_token = this.jwt.sign({ sub, email });
    return { access_token };
  }
}
