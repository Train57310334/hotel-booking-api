export declare class ChannelsService {
    getChannelStatuses(hotelId: string): {
        id: string;
        name: string;
        connected: boolean;
        lastSync: string;
    }[];
    syncInventory(hotelId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
//# sourceMappingURL=channels.service.d.ts.map