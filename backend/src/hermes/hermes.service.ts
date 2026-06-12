import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { UserBehaviorSignal } from './entities/user-behavior-signal.entity';
import { UserBehaviorAlert } from './entities/user-behavior-alert.entity';
import { SignalEventDto } from './dto/signal-event.dto';
import { DeterministicAnalyzer } from './analyzers/deterministic-analyzer';
import { HermesReporterService } from './hermes-reporter.service';

const TOPIC_REPEAT_THRESHOLD = parseInt(
  process.env.HERMES_TOPIC_REPEAT_THRESHOLD ?? '3',
  10,
);
const COOLDOWN_MINUTES = 30;

@Injectable()
export class HermesService {
  private readonly logger = new Logger(HermesService.name);
  private readonly analyzer = new DeterministicAnalyzer();
  private readonly recentEvents = new Map<string, SignalEventDto[]>();

  constructor(
    @InjectRepository(UserBehaviorSignal)
    private readonly signalRepo: Repository<UserBehaviorSignal>,
    @InjectRepository(UserBehaviorAlert)
    private readonly alertRepo: Repository<UserBehaviorAlert>,
    private readonly reporter: HermesReporterService,
  ) {}

  async ingest(
    tenantId: string,
    userId: string,
    event: SignalEventDto,
  ): Promise<void> {
    const userKey = `${tenantId}:${userId}`;
    const recent = this.recentEvents.get(userKey) ?? [];

    const analysis = this.analyzer.analyze(event, recent);

    const signal = this.signalRepo.create({
      tenantId,
      userId,
      sessionId: event.sessionId ?? null,
      signalType: analysis.signalType,
      signalWeight: analysis.weight,
      topicHash: analysis.topicHash,
      rawMessage: event.message ?? null,
      metadata: analysis.metadata,
    });
    const saved = await this.signalRepo.save(signal);

    recent.push(event);
    if (recent.length > 10) recent.shift();
    this.recentEvents.set(userKey, recent);

    const shouldAlert = await this.evaluateThreshold(
      tenantId,
      userId,
      analysis,
    );
    if (!shouldAlert) return;

    const cooldownCutoff = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000);
    const recentAlert = await this.alertRepo.findOne({
      where: { tenantId, userId, createdAt: MoreThan(cooldownCutoff) },
      order: { createdAt: 'DESC' },
    });
    if (recentAlert) {
      this.logger.debug(
        `Hermes cooldown active for user ${userId} — alert suppressed`,
      );
      return;
    }

    await this.reporter.report(tenantId, userId, analysis, saved.id);
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    await this.alertRepo.update(alertId, { acknowledged: true });
  }

  async getUserState(tenantId: string, userId: string) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const alertCount = await this.alertRepo.count({
      where: { tenantId, userId, createdAt: MoreThan(since) },
    });
    const lastAlert = await this.alertRepo.findOne({
      where: { tenantId, userId },
      order: { createdAt: 'DESC' },
    });
    return {
      alertCountToday: alertCount,
      lastAlertAt: lastAlert?.createdAt?.toISOString() ?? null,
    };
  }

  private async evaluateThreshold(
    tenantId: string,
    userId: string,
    analysis: ReturnType<DeterministicAnalyzer['analyze']>,
  ): Promise<boolean> {
    if (analysis.topicHash) {
      const repeatCount = await this.signalRepo.count({
        where: { tenantId, userId, topicHash: analysis.topicHash },
      });
      if (repeatCount >= TOPIC_REPEAT_THRESHOLD) return true;
    }

    if (analysis.weight === 'HIGH') return true;

    if (analysis.weight === 'MEDIUM' && analysis.topicHash) {
      const repeatCount = await this.signalRepo.count({
        where: { tenantId, userId, topicHash: analysis.topicHash },
      });
      if (repeatCount >= 2) return true;
    }

    return false;
  }
}
