import { ReviewsService } from './reviews.service';
export declare class ReviewsController {
    private svc;
    constructor(svc: ReviewsService);
    listPublic(hotelId: string): Promise<({
        user: {
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        hotelId: string;
        status: string;
        rating: number;
        comment: string | null;
    })[]>;
    create(req: any, body: {
        hotelId: string;
        rating: number;
        comment: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        hotelId: string;
        status: string;
        rating: number;
        comment: string | null;
    }>;
    findAll(status?: string, hotelId?: string): Promise<({
        user: {
            email: string;
            name: string;
        };
        hotel: {
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        hotelId: string;
        status: string;
        rating: number;
        comment: string | null;
    })[]>;
    getStats(hotelId?: string): Promise<{
        total: number;
        pending: number;
        approved: number;
        averageRating: number;
    }>;
    updateStatus(id: string, body: {
        status: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        hotelId: string;
        status: string;
        rating: number;
        comment: string | null;
    }>;
    delete(id: string): Promise<{
        id: string;
        createdAt: Date;
        userId: string;
        hotelId: string;
        status: string;
        rating: number;
        comment: string | null;
    }>;
}
//# sourceMappingURL=reviews.controller.d.ts.map