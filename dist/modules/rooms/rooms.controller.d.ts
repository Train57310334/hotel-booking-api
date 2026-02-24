import { RoomsService } from './rooms.service';
export declare class RoomsController {
    private readonly roomsService;
    constructor(roomsService: RoomsService);
    findAll(search?: string, hotelId?: string): Promise<({
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
            roomId: string | null;
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
    getAvailable(roomTypeId: string, checkIn: string, checkOut: string): Promise<{
        status: any;
        id: string;
        roomTypeId: string;
        deletedAt: Date | null;
        roomNumber: string | null;
    }[]>;
    create(createRoomDto: any): Promise<{
        id: string;
        roomTypeId: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        deletedAt: Date | null;
        roomNumber: string | null;
    }>;
    createBulk(body: {
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
        roomTypeId: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        deletedAt: Date | null;
        roomNumber: string | null;
    }>;
    update(id: string, updateRoomDto: any): Promise<{
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
    updateStatus(id: string, body: {
        status: string;
        note?: string;
    }, req: any): Promise<{
        id: string;
        roomTypeId: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        deletedAt: Date | null;
        roomNumber: string | null;
    }>;
}
//# sourceMappingURL=rooms.controller.d.ts.map