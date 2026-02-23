import { PrismaService } from '../../common/prisma/prisma.service';
export declare class ReviewsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: {
        hotelId: string;
        userId: string;
        rating: number;
        comment?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        hotelId: string;
        status: string;
        userId: string;
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
        hotelId: string;
        status: string;
        userId: string;
        rating: number;
        comment: string | null;
    })[]>;
    findByHotel(hotelId: string): Promise<({
        user: {
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        hotelId: string;
        status: string;
        userId: string;
        rating: number;
        comment: string | null;
    })[]>;
    updateStatus(id: string, status: string): Promise<{
        id: string;
        createdAt: Date;
        hotelId: string;
        status: string;
        userId: string;
        rating: number;
        comment: string | null;
    }>;
    delete(id: string): Promise<{
        id: string;
        createdAt: Date;
        hotelId: string;
        status: string;
        userId: string;
        rating: number;
        comment: string | null;
    }>;
    getStats(hotelId?: string): Promise<{
        total: number;
        pending: number;
        approved: number;
        averageRating: number;
    }>;
}
//# sourceMappingURL=reviews.service.d.ts.map