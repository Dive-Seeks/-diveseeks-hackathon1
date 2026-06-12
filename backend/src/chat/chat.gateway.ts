import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: 'chat' })
export class ChatGateway {
  @WebSocketServer() server: Server;

  constructor(
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() data: { tenantId: string; domain: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `chat:${data.tenantId}:${data.domain}`;
    client.join(room);
    return { event: 'joined', room };
  }

  @SubscribeMessage('message')
  async handleMessage(
    @MessageBody()
    data: {
      tenantId: string;
      domain: string;
      content: string;
      senderType: 'user' | 'agent';
      senderId?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const message = await this.chatService.saveMessage(
      data.tenantId,
      data.domain,
      data,
    );
    const room = `chat:${data.tenantId}:${data.domain}`;
    this.server.to(room).emit('message', message);

    return message;
  }

  // Agents emit to tenant via this method
  emitToRoom(
    tenantId: string,
    domain: string,
    event: string,
    payload: unknown,
  ) {
    const room = `chat:${tenantId}:${domain}`;
    this.server.to(room).emit(event, payload);
  }
}
