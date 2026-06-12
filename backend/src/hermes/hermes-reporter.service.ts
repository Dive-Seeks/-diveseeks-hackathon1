import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import {
  UserBehaviorAlert,
  EmotionalState,
  AlertRoute,
} from './entities/user-behavior-alert.entity';
import { AnalysisResult } from './analyzers/deterministic-analyzer';
import { HERMES_MODELS } from '../common/ai-models.constants';
import { SalesGateway } from '../gateways/sales/sales.gateway';
import { AgentChatService } from '../agent-chat/agent-chat.service';

@Injectable()
export class HermesReporterService {
  private readonly logger = new Logger(HermesReporterService.name);

  constructor(
    @InjectRepository(UserBehaviorAlert)
    private readonly alertRepo: Repository<UserBehaviorAlert>,
    private readonly salesGateway: SalesGateway,
    @Optional() private readonly agentChat?: AgentChatService,
  ) {}

  async report(
    tenantId: string,
    userId: string,
    analysis: AnalysisResult,
    signalId: string,
  ): Promise<void> {
    let emotionalState: EmotionalState | null = null;
    let triggerReason: string;
    let routedTo: AlertRoute = 'meeting_room';

    if (analysis.isSoftFlag && analysis.signalType !== 'rapid_send') {
      emotionalState = await this.classifyEmotion(analysis);
    }

    if (analysis.signalType === 'topic_repeat' || analysis.topicHash) {
      triggerReason =
        'You have asked about this topic several times — Abigail wants to address the underlying question directly.';
      routedTo = 'meeting_room';
    } else if (analysis.signalType === 'rephrase') {
      triggerReason =
        'Abigail noticed you rephrased the same question — there may be an underlying confusion worth resolving.';
      routedTo = 'separate_talk';
    } else if (analysis.signalType === 'angry_burst') {
      triggerReason = 'Abigail noticed signs of frustration and wants to help.';
      routedTo = 'meeting_room';
    } else {
      triggerReason = 'Abigail wants to check in on your progress.';
      routedTo = 'separate_talk';
    }

    if (
      emotionalState &&
      ['frustrated', 'anxious', 'defensive'].includes(emotionalState)
    ) {
      routedTo = 'meeting_room';
    }

    const alert = this.alertRepo.create({
      tenantId,
      userId,
      triggerReason,
      emotionalState,
      signalIds: [signalId],
      routedTo,
      acknowledged: false,
    });
    await this.alertRepo.save(alert);

    this.logger.log(`Hermes alert fired for user ${userId}: ${triggerReason}`);

    this.agentChat?.emit({
      tenantId,
      projectId: userId,
      threadId: `hermes-${userId}`,
      fromAgent: 'hermes',
      toAgent: routedTo,
      domain: 'system',
      interactionType: 'hermes_alert',
      content: triggerReason,
      metadata: { emotionalState, routedTo, signalId },
    });

    this.salesGateway.server.emit(`hermes:alert:${userId}`, {
      alert_id: alert.id,
      trigger_reason: triggerReason,
      routed_to: routedTo,
      emotional_state: emotionalState,
    });
  }

  private async classifyEmotion(
    analysis: AnalysisResult,
  ): Promise<EmotionalState> {
    try {
      const { text } = await generateText({
        model: google(HERMES_MODELS.CLASSIFIER),
        prompt: `Classify the emotional state in one word only: neutral | confused | frustrated | anxious | defensive\n\nSignal type: ${analysis.signalType}\nMetadata: ${JSON.stringify(analysis.metadata)}\n\nRespond with exactly one word.`,
        maxTokens: 5,
      } as any);
      const cleaned = text.trim().toLowerCase() as EmotionalState;
      const valid: EmotionalState[] = [
        'neutral',
        'confused',
        'frustrated',
        'anxious',
        'defensive',
      ];
      return valid.includes(cleaned) ? cleaned : 'neutral';
    } catch (err) {
      this.logger.warn(
        `Hermes Layer 2 classification failed: ${err.message} — defaulting to neutral`,
      );
      return 'neutral';
    }
  }
}
