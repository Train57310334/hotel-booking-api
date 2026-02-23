import { PrismaService } from '@/common/prisma/prisma.service';
export declare class RoomsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(search?: string, hotelId?: string): Promise<({
        roomType: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            images: string[];
            amenities: string[];
            hotelId: string;
            bedConfig: string | null;
            sizeSqm: number | null;
            basePrice: number | null;
            maxAdults: number;
            maxChildren: number;
            isFeatured: boolean;
            deletedAt: Date | null;
        };
        bookings: {
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
            roomId: string;
        }[];
        statusLogs: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.RoomStatus;
            roomId: string;
            updatedBy: string | null;
            note: string | null;
        }[];
    } & {
        id: string;
        roomTypeId: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        deletedAt: Date | null;
        roomNumber: string | null;
    })[]>;
    getAvailableRooms(roomTypeId: string, checkIn: string, checkOut: string): Promise<{
        status: any;
        id: string;
        roomTypeId: string;
        deletedAt: Date | null;
        roomNumber: string | null;
    }[]>;
    create(data: any): Promise<{
        id: string;
        roomTypeId: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        deletedAt: Date | null;
        roomNumber: string | null;
    }>;
    createBulk(data: {
        roomTypeId: string;
        prefix?: string;
        startNumber: number;
        count: number;
    }): Promise<import(".prisma/client").Prisma.BatchPayload>;
    findOne(id: string): Promise<{
        roomType: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            images: string[];
            amenities: string[];
            hotelId: string;
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
        roomTypeId: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        deletedAt: Date | null;
        roomNumber: string | null;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        roomTypeId: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        deletedAt: Date | null;
        roomNumber: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        roomTypeId: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        deletedAt: Date | null;
        roomNumber: string | null;
    }>;
    updateStatus(id: string, status: any, userId?: string, note?: string): Promise<{
        id: string;
        roomTypeId: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        deletedAt: Date | null;
        roomNumber: string | null;
    }>;
}
//# sourceMappingURL=rooms.service.d.ts.map