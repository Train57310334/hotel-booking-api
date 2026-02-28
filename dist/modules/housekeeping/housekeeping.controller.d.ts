import { HousekeepingService } from './housekeeping.service';
import { RoomStatus } from '@prisma/client';
export declare class HousekeepingController {
    private readonly housekeepingService;
    constructor(housekeepingService: HousekeepingService);
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
    updateRoomStatus(roomId: string, status: RoomStatus, note: string, req: any): Promise<{
        id: string;
        roomTypeId: string;
        status: import(".prisma/client").$Enums.RoomStatus;
        deletedAt: Date | null;
        roomNumber: string | null;
    }>;
}
//# sourceMappingURL=housekeeping.controller.d.ts.map