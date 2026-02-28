import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
export declare class RatesService {
    private prisma;
    constructor(prisma: PrismaService);
    createRatePlan(data: Prisma.RatePlanUncheckedCreateInput): Promise<{
        id: string;
        name: string;
        hotelId: string;
        roomTypeId: string | null;
        includesBreakfast: boolean;
        breakfastPrice: number;
        cancellationRule: string | null;
        adultPricePolicy: string | null;
        childPricePolicy: string | null;
    }>;
    getRatePlans(hotelId: string): Promise<({
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
        name: string;
        hotelId: string;
        roomTypeId: string | null;
        includesBreakfast: boolean;
        breakfastPrice: number;
        cancellationRule: string | null;
        adultPricePolicy: string | null;
        childPricePolicy: string | null;
    })[]>;
    updateRatePlan(id: string, data: Prisma.RatePlanUncheckedUpdateInput): Promise<{
        id: string;
        name: string;
        hotelId: string;
        roomTypeId: string | null;
        includesBreakfast: boolean;
        breakfastPrice: number;
        cancellationRule: string | null;
        adultPricePolicy: string | null;
        childPricePolicy: string | null;
    }>;
    deleteRatePlan(id: string): Promise<{
        id: string;
        name: string;
        hotelId: string;
        roomTypeId: string | null;
        includesBreakfast: boolean;
        breakfastPrice: number;
        cancellationRule: string | null;
        adultPricePolicy: string | null;
        childPricePolicy: string | null;
    }>;
    upsertOverride(data: {
        roomTypeId: string;
        ratePlanId: string;
        date: string | Date;
        baseRate: number;
        reason?: string;
    }): Promise<{
        id: string;
        roomTypeId: string;
        ratePlanId: string;
        date: Date;
        baseRate: number;
        reason: string | null;
    }>;
    upsertOverrideBulk(data: {
        roomTypeId: string;
        ratePlanId: string;
        startDate: string;
        endDate: string;
        baseRate: number;
        reason?: string;
    }): Promise<{
        id: string;
        roomTypeId: string;
        ratePlanId: string;
        date: Date;
        baseRate: number;
        reason: string | null;
    }[]>;
    getOverrides(roomTypeId: string, startDate: string, endDate: string): Promise<{
        id: string;
        roomTypeId: string;
        ratePlanId: string;
        date: Date;
        baseRate: number;
        reason: string | null;
    }[]>;
    calculatePrice(roomTypeId: string, ratePlanId: string, checkIn: Date, checkOut: Date): Promise<number>;
}
//# sourceMappingURL=rates.service.d.ts.map