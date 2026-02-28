import { PrismaService } from '../../common/prisma/prisma.service';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: {
        email: string;
        passwordHash: string;
        name?: string;
    }): import(".prisma/client").Prisma.Prisma__UserClient<{
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
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    findByEmail(email: string): import(".prisma/client").Prisma.Prisma__UserClient<{
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
    }, null, import("@prisma/client/runtime/library").DefaultArgs>;
    findAll(search?: string, hotelId?: string, page?: number, limit?: number): Promise<{
        data: ({
            bookings: {
                createdAt: Date;
            }[];
            _count: {
                bookings: number;
            };
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
        })[];
        meta: {
            total: number;
            page: number;
            last_page: number;
            limit: number;
        };
    }>;
    me(id: string): import(".prisma/client").Prisma.Prisma__UserClient<{
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
    }, null, import("@prisma/client/runtime/library").DefaultArgs>;
    findOne(id: string): import(".prisma/client").Prisma.Prisma__UserClient<{
        bookings: ({
            roomType: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                hotelId: string;
                description: string | null;
                images: string[];
                amenities: string[];
                bedConfig: string | null;
                sizeSqm: number | null;
                basePrice: number | null;
                maxAdults: number;
                maxChildren: number;
                isFeatured: boolean;
                icalUrl: string | null;
                deletedAt: Date | null;
            };
        } & {
            id: string;
            notes: string | null;
            createdAt: Date;
            updatedAt: Date;
            userId: string | null;
            hotelId: string;
            roomTypeId: string;
            ratePlanId: string;
            checkIn: Date;
            checkOut: Date;
            guestsAdult: number;
            guestsChild: number;
            totalAmount: number;
            status: string;
            leadName: string;
            leadEmail: string;
            leadPhone: string;
            specialRequests: string | null;
            source: string | null;
            roomId: string | null;
        })[];
        _count: {
            bookings: number;
        };
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
    }, null, import("@prisma/client/runtime/library").DefaultArgs>;
    update(id: string, data: any): import(".prisma/client").Prisma.Prisma__UserClient<{
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
    }, never, import("@prisma/client/runtime/library").DefaultArgs>;
    changePassword(userId: string, oldPass: string, newPass: string): Promise<{
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
//# sourceMappingURL=users.service.d.ts.map