import { PrismaService } from '@/common/prisma/prisma.service';
import { RoomStatus } from '@prisma/client';
export declare class HousekeepingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getHousekeepingStatus(hotelId: string): Promise<{
        id: string;
        name: string;
        bedConfig: string;
        rooms: {
            id: string;
            roomNumber: string;
            status: import(".prisma/client").$Enums.RoomStatus;
            isOccupied: boolean;
            lastStatusUpdate: {
                updatedAt: Date;
                updatedBy: string;
                note: string;
            };
            currentGuest: string;
            checkOutDate: Date;
        }[];
    }[]>;
    updateRoomStatus(roomId: string, status: RoomStatus, userId?: string, note?: string): Promise<{
        id: string;
        roomTypeId: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        deletedAt: Date | null;
        roomNumber: string | null;
    }>;
}
//# sourceMappingURL=housekeeping.service.d.ts.map