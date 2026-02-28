import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('EventsGateway');
  // Simple map to track hotel-specific admin rooms
  // key: socketId, value: Set<string> (hotelIds)
  private clientHotels: Map<string, Set<string>> = new Map();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      // 1. Extract token from header or query or auth payload
      const token = this.extractTokenFromClient(client);

      if (!token) {
        this.logger.warn(`Client disconnected (No token). Socket ID: ${client.id}`);
        client.disconnect();
        return;
      }

      // 2. Verify token
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'change_this_secret_key',
      });

      // 3. User is authenticated. Setup context
      // Admin users should join their specific hotel's room to receive relevant notifications
      // Let's attach user info to socket
      (client as any).user = payload;
      this.logger.log(`Client connected: ${client.id} - User: ${payload.email}`);
      
      // We will let the client explicitly ask to join a hotel \"room\" using an event
      // instead of inferring it, as a super-admin might need to listen to all.
    } catch (err) {
      this.logger.error(`Client disconnected (Invalid token). Socket ID: ${client.id}`, err.stack);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.clientHotels.delete(client.id);
  }

  // --- Utility to extract JWT ---
  private extractTokenFromClient(client: Socket): string | null {
    // Check Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }

    // Check auth payload in connection (often used by socket.io-client)
    if (client.handshake.auth && client.handshake.auth.token) {
      return client.handshake.auth.token;
    }

    // Fallback to query param (less secure but common)
    const queryToken = client.handshake.query.token;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken;
    }
    
    // Cookie parsing
    if (client.handshake.headers.cookie) {
       const match = client.handshake.headers.cookie.match(/(?:^|;\\s*)token=([^;]*)/);
       if (match) {
         return match[1];
       }
    }

    return null;
  }

  // --- Client Subscription Commands ---
  @SubscribeMessage('joinHotelRoom')
  handleJoinHotelRoom(client: Socket, hotelId: string) {
    if (!hotelId) return { status: 'error', message: 'No hotelId provided' };
    
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
  
  @SubscribeMessage('leaveHotelRoom')
  handleLeaveHotelRoom(client: Socket, hotelId: string) {
     if (!hotelId) return;
     const roomName = `hotel_${hotelId}`;
     client.leave(roomName);
     const hotels = this.clientHotels.get(client.id);
     if (hotels) hotels.delete(hotelId);
     this.logger.log(`Client ${client.id} left room: ${roomName}`);
  }

  // --- Broadcasting Methods ---

  /**
   * Broadcast an event to all clients listening to a specific hotel.
   */
  broadcastToHotel(hotelId: string, event: string, payload: any) {
    const roomName = `hotel_${hotelId}`;
    this.server.to(roomName).emit(event, payload);
    this.logger.log(`Broadcasted [${event}] to room [${roomName}]`);
  }

  /**
   * Broadcast an event to all connected clients (Global)
   */
  broadcastGlobal(event: string, payload: any) {
    this.server.emit(event, payload);
  }
}
