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
        hotelId: string | null;
        userId: string;
        role: string;
    }>;
    getRolesByUser(userId: string): Promise<({
        hotel: {
            id: string;
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        hotelId: string | null;
        userId: string;
        role: string;
    })[]>;
    revokeRole(id: string): Promise<{
        id: string;
        createdAt: Date;
        hotelId: string | null;
        userId: string;
        role: string;
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
        hotelId: string | null;
        userId: string;
        role: string;
    })[]>;
}
//# sourceMappingURL=roles.controller.d.ts.map