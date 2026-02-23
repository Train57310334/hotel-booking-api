import { MessagesService } from './messages.service';
export declare class MessagesController {
    private svc;
    constructor(svc: MessagesService);
    findAll(search?: string, hotelId?: string): Promise<any>;
    create(body: any): Promise<any>;
    findOne(id: string): Promise<any>;
    markAsRead(id: string): Promise<any>;
    reply(id: string, body: {
        content: string;
    }): Promise<any>;
    archive(id: string): Promise<any>;
    delete(id: string): Promise<any>;
}
//# sourceMappingURL=messages.controller.d.ts.map