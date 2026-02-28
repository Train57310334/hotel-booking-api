import { IcalService } from './ical.service';
import { Response } from 'express';
export declare class IcalController {
    private readonly icalService;
    constructor(icalService: IcalService);
    exportIcal(hotelId: string, res: Response): Promise<void>;
}
//# sourceMappingURL=ical.controller.d.ts.map