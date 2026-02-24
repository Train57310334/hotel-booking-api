import { Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
export declare function invalidateUserCache(userId: string): void;
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    constructor(prisma: PrismaService);
    validate(payload: any): Promise<{
        userId: string;
        email: string;
        roles: string[];
        hotelId: string;
        roleAssignments: any[];
    }>;
}
export {};
//# sourceMappingURL=jwt.strategy.d.ts.map