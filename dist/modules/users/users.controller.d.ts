import { UsersService } from './users.service';
export declare class UsersController {
    private svc;
    constructor(svc: UsersService);
    findAll(search?: string, hotelId?: string): Promise<{
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
    me(req: any): Promise<{
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
    updateMe(req: any, body: any): Promise<{
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
    changePassword(req: any, body: any): Promise<{
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
                deletedAt: Date | null;
            };
        } & {
            id: string;
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
    }>;
    update(id: string, body: any): Promise<{
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
//# sourceMappingURL=users.controller.d.ts.map