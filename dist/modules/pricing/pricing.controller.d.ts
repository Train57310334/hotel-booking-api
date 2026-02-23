declare class PricingDto {
    hotelId: string;
    roomTypeId: string;
    ratePlanId: string;
    checkIn: string;
    checkOut: string;
    promoCode?: string;
}
export declare class PricingController {
    calc(dto: PricingDto): {
        nights: any[];
        subtotal: number;
        discount: any;
        taxesAndFees: number;
        total: number;
        currency: string;
    };
}
export {};
//# sourceMappingURL=pricing.controller.d.ts.map