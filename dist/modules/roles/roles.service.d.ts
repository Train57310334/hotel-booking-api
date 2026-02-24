import { PrismaService } from '@/common/prisma/prisma.service';
export declare class RolesService {
    private prisma;
    constructor(prisma: PrismaService);
    assignRole(userId: string, role: string, hotelId?: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        hotelId: string | null;
        role: string;
    }>;
    getRolesByUser(userId: string): Promise<({
        hotel: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        hotelId: string | null;
        role: string;
    })[]>;
    revokeRole(id: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        hotelId: string | null;
        role: string;
    }>;
    listHotelAdmins(): Promise<({
        user: {
            id: string;
            email: string;
            name: string;
        };
        hotel: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        hotelId: string | null;
        role: string;
    })[]>;
}
//# sourceMappingURL=roles.service.d.ts.map