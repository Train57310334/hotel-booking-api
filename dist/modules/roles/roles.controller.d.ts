import { RolesService } from './roles.service';
export declare class RolesController {
    private readonly rolesService;
    constructor(rolesService: RolesService);
    assignRole(body: {
        userId: string;
        role: string;
        hotelId?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        role: string;
        userId: string;
        hotelId: string | null;
    }>;
    getRolesByUser(userId: string): Promise<({
        hotel: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        role: string;
        userId: string;
        hotelId: string | null;
    })[]>;
    revokeRole(id: string): Promise<{
        id: string;
        createdAt: Date;
        role: string;
        userId: string;
        hotelId: string | null;
    }>;
    listHotelAdmins(): Promise<({
        user: {
            id: string;
            email: string;
            name: string;
        };
        hotel: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        role: string;
        userId: string;
        hotelId: string | null;
    })[]>;
}
//# sourceMappingURL=roles.controller.d.ts.map