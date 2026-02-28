import { ChannelsService } from './channels.service';
export declare class ChannelsController {
    private readonly channelsService;
    constructor(channelsService: ChannelsService);
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
//# sourceMappingURL=channels.controller.d.ts.map