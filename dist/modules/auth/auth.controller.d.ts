import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(body: {
        email: string;
        password: string;
        name?: string;
        phone?: string;
    }): Promise<{
        user: {
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
        };
        token: string;
    }>;
    registerPartner(body: {
        hotelName: string;
        email: string;
        password: string;
        name: string;
        phone?: string;
        package?: string;
    }): Promise<{
        user: {
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
        };
        hotel: {
            id: string;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            package: string;
            description: string | null;
            address: string | null;
            city: string | null;
            country: string | null;
            latitude: number | null;
            longitude: number | null;
            imageUrl: string | null;
            logoUrl: string | null;
            images: string[];
            amenities: string[];
            contactEmail: string | null;
            contactPhone: string | null;
            heroTitle: string | null;
            heroDescription: string | null;
            promptPayId: string | null;
            bankName: string | null;
            bankAccountName: string | null;
            bankAccountNumber: string | null;
            subscriptionEnd: Date | null;
            maxRooms: number;
            maxRoomTypes: number;
            maxStaff: number;
            hasPromotions: boolean;
            hasOnlinePayment: boolean;
            isSuspended: boolean;
            ownerId: string | null;
        };
        token: string;
    }>;
    login(body: {
        email: string;
        password: string;
    }): Promise<{
        user: {
            roleAssignments: {
                id: string;
                createdAt: Date;
                userId: string;
                hotelId: string | null;
                role: string;
            }[];
        } & {
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
        };
        token: string;
    }>;
    getProfile(req: any): Promise<{
        id: string;
        email: string;
        name: string;
        phone: string;
        roles: string[];
        avatarUrl: string;
        roleAssignments: ({
            hotel: {
                id: string;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                package: string;
                description: string | null;
                address: string | null;
                city: string | null;
                country: string | null;
                latitude: number | null;
                longitude: number | null;
                imageUrl: string | null;
                logoUrl: string | null;
                images: string[];
                amenities: string[];
                contactEmail: string | null;
                contactPhone: string | null;
                heroTitle: string | null;
                heroDescription: string | null;
                promptPayId: string | null;
                bankName: string | null;
                bankAccountName: string | null;
                bankAccountNumber: string | null;
                subscriptionEnd: Date | null;
                maxRooms: number;
                maxRoomTypes: number;
                maxStaff: number;
                hasPromotions: boolean;
                hasOnlinePayment: boolean;
                isSuspended: boolean;
                ownerId: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            hotelId: string | null;
            role: string;
        })[];
    }>;
    impersonate(body: {
        targetHotelId: string;
    }): Promise<{
        user: {
            roleAssignments: {
                id: string;
                createdAt: Date;
                userId: string;
                hotelId: string | null;
                role: string;
            }[];
        } & {
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
        };
        token: string;
        isImpersonating: boolean;
    }>;
}
//# sourceMappingURL=auth.controller.d.ts.map