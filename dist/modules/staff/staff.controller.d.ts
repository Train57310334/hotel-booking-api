import { StaffService } from './staff.service';
export declare class StaffController {
    private readonly svc;
    constructor(svc: StaffService);
    findAll(req: any, queryHotelId: string): Promise<{
        role: string;
        roleAssignments: {
            id: string;
            createdAt: Date;
            role: string;
            userId: string;
            hotelId: string | null;
        }[];
        id: string;
        email: string;
        passwordHash: string;
        name: string | null;
        phone: string | null;
        roles: string[];
        avatarUrl: string | null;
        tags: string[];
        notes: string | null;
        preferences: string | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    create(req: any, body: any, queryHotelId: string): Promise<{
        id: string;
        email: string;
        passwordHash: string;
        name: string | null;
        phone: string | null;
        roles: string[];
        avatarUrl: string | null;
        tags: string[];
        notes: string | null;
        preferences: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(req: any, id: string, body: any, queryHotelId: string): Promise<{
        id: string;
        createdAt: Date;
        role: string;
        userId: string;
        hotelId: string | null;
    }>;
    remove(req: any, id: string, queryHotelId: string): Promise<{
        id: string;
        createdAt: Date;
        role: string;
        userId: string;
        hotelId: string | null;
    }>;
}
//# sourceMappingURL=staff.controller.d.ts.map