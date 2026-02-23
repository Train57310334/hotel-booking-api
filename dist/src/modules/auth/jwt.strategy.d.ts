import { Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private prisma;
    constructor(prisma: PrismaService);
    validate(payload: any): Promise<{
        userId: string;
        email: string;
        roles: string[];
        hotelId: string;
        roleAssignments: {
            id: string;
            createdAt: Date;
            hotelId: string | null;
            userId: string;
            role: string;
        }[];
    }>;
}
export {};
//# sourceMappingURL=jwt.strategy.d.ts.map