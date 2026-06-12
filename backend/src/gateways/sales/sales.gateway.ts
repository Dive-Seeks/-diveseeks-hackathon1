import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { EventEmitter } from 'events';
import { WorkflowPhaseEvent } from '../../abigail/workflow-phase-event.types';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SalesGateway implements OnGatewayConnection {
  constructor(private readonly jwtService: JwtService) {}
  @WebSocketServer()
  server: Server;

  /** Internal Node.js emitter — SSE bridge subscribes here, not to socket.io server */
  readonly internalEmitter = new EventEmitter();

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      // ignoreExpiration so long-lived WS sessions survive past the token's exp.
      // Signature is still verified — only clock expiry is skipped.
      const payload = this.jwtService.verify<{
        tenantId: string;
        userId: string;
      }>(token, {
        ignoreExpiration: true,
      });
      client.data.tenantId = payload.tenantId ?? payload.userId;
      client.join(`tenant_${client.data.tenantId}`);
    } catch {
      client.disconnect();
    }
  }

  emitSaleCreated(sale: any) {
    this.server.emit('sale_created', sale);
  }

  emitInventoryUpdated(update: any) {
    this.server.emit('inventory_updated', update);
  }

  emitProductUpdated(product: any) {
    this.server.emit('product_updated', product);
  }

  emitBusinessCreated(business: any) {
    this.server.emit('business_created', business);
  }

  emitBusinessUpdated(business: any) {
    this.server.emit('business_updated', business);
  }

  emitStoreRecordUpdated() {
    this.server.emit('store_record_updated');
  }

  emitMenuImageGenerated(payload: {
    imageId: string;
    tenantId: string;
    storeId?: string;
    imageUrl: string;
    thumbnailUrl: string;
  }) {
    this.server.emit('menu_image_generated', payload);
  }

  emitMenuImageFailed(payload: { imageId: string; error: string }) {
    this.server.emit('menu_image_failed', payload);
  }

  emitTaskComplete(payload: {
    teamId: string;
    userId: string;
    sessionId: string;
    specialist: string;
    result: string;
    taskOutcome: 'success' | 'fail' | 'needs_review';
    files: Array<{ path: string; content: string }>;
    disciplineReport?: any;
  }) {
    this.server.to(`tenant_${payload.teamId}`).emit('task_complete', payload);
    this.internalEmitter.emit('task_complete', payload);
  }

  emitTaskFailed(payload: {
    teamId: string;
    userId: string;
    sessionId: string;
    specialist: string;
    error: string;
  }) {
    this.server.to(`tenant_${payload.teamId}`).emit('task_failed', payload);
    this.internalEmitter.emit('task_failed', payload);
  }

  emitNeedsHuman(payload: {
    teamId: string;
    userId: string;
    sessionId: string;
    stepKey: string;
    resumeUrl: string;
    taskSessionId?: string;
    requirementId?: string;
    requirementText?: string;
    instruction?: string;
    watchingFor?: string[];
    timeoutMs?: number;
  }) {
    this.server.to(`tenant_${payload.teamId}`).emit('needs_human', payload);
    this.internalEmitter.emit('needs_human', payload);
  }

  emitOrphaned(payload: {
    teamId: string;
    userId: string;
    sessionId: string;
    lastCompletedStep: string | null;
    resumeUrl: string;
  }) {
    this.server.to(`tenant_${payload.teamId}`).emit('task_orphaned', payload);
  }

  emitWorkflowPhase(projectId: string, event: WorkflowPhaseEvent): void {
    this.server.to(`project_feed_${projectId}`).emit('project_feed_updated', {
      type: 'workflow_phase',
      projectId,
      ...event,
    });
  }

  emitMcpServerFailed(payload: {
    teamId: string;
    serverId: string;
    serverName: string;
    error: string;
  }) {
    this.server.emit('mcp_server_failed', payload);
  }

  emitTestReviewNeeded(payload: {
    taskSessionId: string;
    taskSlug: string;
    prdFeatureMapId: string;
    prdVersion: number;
    goal: string;
    failingRequirements: {
      id: string;
      text: string;
      error: string;
      screenshotPath?: string;
      specFile: string;
    }[];
  }) {
    this.server.emit('test_review_needed', payload);
    this.internalEmitter.emit('test_review_needed', payload);
  }

  emitHumanActionNeeded(payload: {
    taskSessionId: string;
    requirementId: string;
    requirementText: string;
    instruction: string;
    watchingFor: string[];
    timeoutMs: number;
  }) {
    this.server.emit('human_action_needed', payload);
    this.internalEmitter.emit('human_action_needed', payload);
  }

  /**
   * Emits agent pipeline progress to the tenant's connected clients.
   * Frontend subscribes to 'task_progress' events keyed by sessionId.
   */
  emitTaskProgress(payload: {
    sessionId: string;
    tenantId: string;
    userId: string;
    step: string; // e.g. 'vision_check', 'routing', 'specialist', 'review', 'done'
    stepIndex: number; // 1-based
    totalSteps: number;
    agentName: string; // human-readable agent name shown in UI
    status: 'running' | 'done' | 'failed' | 'queued';
    message?: string;
  }) {
    this.server.to(`tenant_${payload.tenantId}`).emit('task_progress', payload);
  }

  @SubscribeMessage('join_project_feed')
  handleJoinProjectFeed(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { projectId: string },
  ) {
    if (payload?.projectId) {
      client.join(`project_feed_${payload.projectId}`);
    }
  }

  @SubscribeMessage('leave_project_feed')
  handleLeaveProjectFeed(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { projectId: string },
  ) {
    if (payload?.projectId) {
      client.leave(`project_feed_${payload.projectId}`);
    }
  }

  emitProjectFeedUpdate(projectId: string, payload: any) {
    this.server
      .to(`project_feed_${projectId}`)
      .emit('project_feed_updated', payload);
  }

  @SubscribeMessage('ping')
  handlePing(@MessageBody() _data: string): string {
    return 'pong';
  }
}
