import { PrismaService } from '@/common/prisma/prisma.service';
export declare class OwnersService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(search?: string): Promise<{
        hotelCount: number;
        _count: {
            Hotel: number;
        };
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
    create(data: any): Promise<{
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
    findOne(id: string): Promise<{
        Hotel: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            package: string;
            description: string | null;
            address: string | null;
            city: string | null;
            country: string | null;
            latitude: number | null;
            longitude: number | null;
            imageUrl: string | null;
            logoUrl: string | null;
            images: string[];
            amenities: string[];
            contactEmail: string | null;
            contactPhone: string | null;
            heroTitle: string | null;
            heroDescription: string | null;
            promptPayId: string | null;
            bankName: string | null;
            bankAccountName: string | null;
            bankAccountNumber: string | null;
            subscriptionEnd: Date | null;
            maxRooms: number;
            maxRoomTypes: number;
            maxStaff: number;
            hasPromotions: boolean;
            hasOnlinePayment: boolean;
            isSuspended: boolean;
            ownerId: string | null;
        }[];
    } & {
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
    update(id: string, data: any): Promise<{
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
    remove(id: string): Promise<{
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
}
//# sourceMappingURL=owners.service.d.ts.map