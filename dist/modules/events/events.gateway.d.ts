import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
export declare class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    server: Server;
    private logger;
    private clientHotels;
    constructor(jwtService: JwtService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    private extractTokenFromClient;
    handleJoinHotelRoom(client: Socket, hotelId: string): {
        status: string;
        message: string;
        event?: undefined;
        room?: undefined;
    } | {
        status: string;
        event: string;
        room: string;
        message?: undefined;
    };
    handleLeaveHotelRoom(client: Socket, hotelId: string): void;
    broadcastToHotel(hotelId: string, event: string, payload: any): void;
    broadcastGlobal(event: string, payload: any): void;
}
//# sourceMappingURL=events.gateway.d.ts.map