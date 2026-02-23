import { PrismaService } from '@/common/prisma/prisma.service';
export declare class RoomsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(search?: string, hotelId?: string): Promise<({
        bookings: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            hotelId: string;
            roomTypeId: string;
            status: string;
            checkIn: Date;
            checkOut: Date;
            guestsAdult: number;
            guestsChild: number;
            totalAmount: number;
            leadName: string;
            leadEmail: string;
            leadPhone: string;
            specialRequests: string | null;
            userId: string | null;
            ratePlanId: string;
            roomId: string;
        }[];
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
        deletedAt: Date | null;
        roomTypeId: string;
        roomNumber: string | null;
        status: import(".prisma/client").$Enums.RoomStatus;
    })[]>;
    getAvailableRooms(roomTypeId: string, checkIn: string, checkOut: string): Promise<{
        status: any;
        id: string;
        deletedAt: Date | null;
        roomTypeId: string;
        roomNumber: string | null;
    }[]>;
    create(data: any): Promise<{
        id: string;
        deletedAt: Date | null;
        roomTypeId: string;
        roomNumber: string | null;
        status: import(".prisma/client").$Enums.RoomStatus;
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
        deletedAt: Date | null;
        roomTypeId: string;
        roomNumber: string | null;
        status: import(".prisma/client").$Enums.RoomStatus;
    }>;
    update(id: string, data: any): Promise<{
        id: string;
        deletedAt: Date | null;
        roomTypeId: string;
        roomNumber: string | null;
        status: import(".prisma/client").$Enums.RoomStatus;
    }>;
    remove(id: string): Promise<{
        id: string;
        deletedAt: Date | null;
        roomTypeId: string;
        roomNumber: string | null;
        status: import(".prisma/client").$Enums.RoomStatus;
    }>;
    updateStatus(id: string, status: any, userId?: string, note?: string): Promise<{
        id: string;
        deletedAt: Date | null;
        roomTypeId: string;
        roomNumber: string | null;
        status: import(".prisma/client").$Enums.RoomStatus;
    }>;
}
//# sourceMappingURL=rooms.service.d.ts.map