"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const common_1 = require("@nestjs/common");
let EventsGateway = class EventsGateway {
    constructor(jwtService) {
        this.jwtService = jwtService;
        this.logger = new common_1.Logger('EventsGateway');
        this.clientHotels = new Map();
    }
    async handleConnection(client) {
        try {
            const token = this.extractTokenFromClient(client);
            if (!token) {
                this.logger.warn(`Client disconnected (No token). Socket ID: ${client.id}`);
                client.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET || 'change_this_secret_key',
            });
            client.user = payload;
            this.logger.log(`Client connected: ${client.id} - User: ${payload.email}`);
        }
        catch (err) {
            this.logger.error(`Client disconnected (Invalid token). Socket ID: ${client.id}`, err.stack);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        this.clientHotels.delete(client.id);
    }
    extractTokenFromClient(client) {
        const authHeader = client.handshake.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.split(' ')[1];
        }
        if (client.handshake.auth && client.handshake.auth.token) {
            return client.handshake.auth.token;
        }
        const queryToken = client.handshake.query.token;
        if (queryToken && typeof queryToken === 'string') {
            return queryToken;
        }
        if (client.handshake.headers.cookie) {
            const match = client.handshake.headers.cookie.match(/(?:^|;\\s*)token=([^;]*)/);
            if (match) {
                return match[1];
            }
        }
        return null;
    }
    handleJoinHotelRoom(client, hotelId) {
        if (!hotelId)
            return { status: 'error', message: 'No hotelId provided' };
        const roomName = `hotel_${hotelId}`;
        client.join(roomName);
        let hotels = this.clientHotels.get(client.id);
        if (!hotels) {
            hotels = new Set();
            this.clientHotels.set(client.id, hotels);
        }
        hotels.add(hotelId);
        this.logger.log(`Client ${client.id} joined room: ${roomName}`);
        return { status: 'success', event: 'joined', room: roomName };
    }
    handleLeaveHotelRoom(client, hotelId) {
        if (!hotelId)
            return;
        const roomName = `hotel_${hotelId}`;
        client.leave(roomName);
        const hotels = this.clientHotels.get(client.id);
        if (hotels)
            hotels.delete(hotelId);
        this.logger.log(`Client ${client.id} left room: ${roomName}`);
    }
    broadcastToHotel(hotelId, event, payload) {
        const roomName = `hotel_${hotelId}`;
        this.server.to(roomName).emit(event, payload);
        this.logger.log(`Broadcasted [${event}] to room [${roomName}]`);
    }
    broadcastGlobal(event, payload) {
        this.server.emit(event, payload);
    }
};
exports.EventsGateway = EventsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], EventsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinHotelRoom'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleJoinHotelRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leaveHotelRoom'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, String]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleLeaveHotelRoom", null);
exports.EventsGateway = EventsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], EventsGateway);
//# sourceMappingURL=events.gateway.js.map