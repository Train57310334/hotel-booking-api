import { PrismaService } from '../../common/prisma/prisma.service';
export declare class StaffService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(hotelId: string): Promise<{
        role: string;
        roleAssignments: {
            id: string;
            createdAt: Date;
            role: string;
            userId: string;
            hotelId: string | null;
        }[];
        id: string;
        email: string;
        passwordHash: string;
        name: string | null;
        phone: string | null;
        roles: string[];
        avatarUrl: string | null;
        tags: string[];
        notes: string | null;
        preferences: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    create(hotelId: string, data: any): Promise<{
        id: string;
        email: string;
        passwordHash: string;
        name: string | null;
        phone: string | null;
        roles: string[];
        avatarUrl: string | null;
        tags: string[];
        notes: string | null;
        preferences: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateRole(hotelId: string, userId: string, role: string): Promise<{
        id: string;
        createdAt: Date;
        role: string;
        userId: string;
        hotelId: string | null;
    }>;
    remove(hotelId: string, userId: string): Promise<{
        id: string;
        createdAt: Date;
        role: string;
        userId: string;
        hotelId: string | null;
    }>;
}
//# sourceMappingURL=staff.service.d.ts.map