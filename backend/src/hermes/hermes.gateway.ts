import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { HermesService } from './hermes.service';
import { SignalEventDto } from './dto/signal-event.dto';

@WebSocketGateway({
  namespace: '/hermes',
  cors: { origin: '*' },
})
export class HermesGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(HermesGateway.name);

  constructor(private readonly hermesService: HermesService) {}

  handleConnection(client: Socket) {
    this.logger.debug(`Hermes client connected: ${client.id}`);
  }

  @SubscribeMessage('signal')
  async handleSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ): Promise<void> {
    const tenantId: string = (client.handshake.auth as any)?.tenantId;
    if (!tenantId || typeof tenantId !== 'string') {
      this.logger.warn(
        `Signal rejected — missing tenantId from client ${client.id}`,
      );
      client.disconnect();
      return;
    }
    const userId: string = (client.handshake.auth as any)?.userId ?? client.id;

    const dto = plainToInstance(SignalEventDto, payload);
    const errors = await validate(dto);
    if (errors.length > 0) {
      this.logger.warn(
        `Invalid signal from ${client.id}: ${JSON.stringify(errors)}`,
      );
      return;
    }

    await this.hermesService.ingest(tenantId, userId, dto);
  }

  @SubscribeMessage('acknowledge_alert')
  async handleAcknowledge(
    @MessageBody() payload: { alert_id: string },
  ): Promise<void> {
    if (payload?.alert_id) {
      await this.hermesService.acknowledgeAlert(payload.alert_id);
    }
  }
}
