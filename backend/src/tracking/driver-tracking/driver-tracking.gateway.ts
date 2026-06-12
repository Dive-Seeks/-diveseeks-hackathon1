import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/tracking',
})
export class DriverTrackingGateway {
  private readonly logger = new Logger(DriverTrackingGateway.name);

  @WebSocketServer()
  server: Server;

  emitDriverLocationUpdate(payload: {
    tenantId: string;
    driverId: string;
    orderId: string;
    latitude: number;
    longitude: number;
    timestamp: string;
  }) {
    this.server.emit('driver.location.updated', payload);
  }

  @SubscribeMessage('tracking.ping')
  handlePing(@MessageBody() payload: { tenantId: string }) {
    this.logger.debug(`Tracking ping received for tenant ${payload?.tenantId}`);
    return { event: 'tracking.pong', data: { ok: true } };
  }
}
