import { GuestsService } from './guests.service';
import { Response } from 'express';
export declare class GuestsController {
    private readonly guestsService;
    constructor(guestsService: GuestsService);
    addGuest(body: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        bookingId: string;
        idType: string;
        idNumber: string | null;
        documentUrl: string | null;
    }>;
    removeGuest(id: string): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        bookingId: string;
        idType: string;
        idNumber: string | null;
        documentUrl: string | null;
    }>;
    uploadFile(file: any): Promise<{
        url: string;
    }>;
    serveFile(filename: string, res: Response): Promise<void>;
}
//# sourceMappingURL=guests.controller.d.ts.map