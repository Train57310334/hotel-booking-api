import { InventoryService } from './inventory.service';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    getInventory(roomTypeId: string, startDate: string, endDate: string): Promise<{
        id: string;
        roomTypeId: string;
        date: Date;
        allotment: number;
        stopSale: boolean;
        minStay: number;
    }[]>;
    updateInventory(roomTypeId: string, date: string, body: UpdateInventoryDto): Promise<{
        id: string;
        roomTypeId: string;
        date: Date;
        allotment: number;
        stopSale: boolean;
        minStay: number;
    }>;
    updateBulk(body: {
        roomTypeId: string;
        startDate: string;
        endDate: string;
        allotment?: number;
        stopSale?: boolean;
        minStay?: number;
    }): Promise<{
        id: string;
        roomTypeId: string;
        date: Date;
        allotment: number;
        stopSale: boolean;
        minStay: number;
    }[]>;
}
//# sourceMappingURL=inventory.controller.d.ts.map