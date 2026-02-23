import { AvailabilityService } from './availability.service';
declare class AvailabilityDto {
    hotelId: string;
    checkIn: string;
    checkOut: string;
}
export declare class AvailabilityController {
    private svc;
    constructor(svc: AvailabilityService);
    check(dto: AvailabilityDto): Promise<{
        roomTypeId: string;
        availableAllotment: number;
        minStay: number;
        stopSale: boolean;
        ratePlans: any[];
    }[]>;
}
export {};
//# sourceMappingURL=availability.controller.d.ts.map