import {
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import {
  McpServerRegistration,
  McpStatus,
} from './entities/mcp-server-registration.entity';
import { RegisterMcpDto } from './dto/register-mcp.dto';
import { McpValidatorService } from './mcp-validator.service';
import { SalesGateway } from '../gateways/sales/sales.gateway';

const STALE_MISS_THRESHOLD = 3;
const HEARTBEAT_INTERVAL_MS = 60_000;

@Injectable()
export class McpRegistryService {
  private readonly logger = new Logger(McpRegistryService.name);
  private readonly sharedSecret: string;

  constructor(
    @InjectRepository(McpServerRegistration)
    private readonly repo: Repository<McpServerRegistration>,
    private readonly validator: McpValidatorService,
    private readonly salesGateway: SalesGateway,
    private readonly configService: ConfigService,
  ) {
    this.sharedSecret =
      this.configService.get<string>('BRAIN_SHARED_SECRET') ??
      'dev-secret-change-me';
  }

  // ── Registration Token ─────────────────────────────────────────────────────

  generateRegistrationToken(mcpId: string): string {
    return crypto
      .createHmac('sha256', this.sharedSecret)
      .update(mcpId)
      .digest('hex');
  }

  private verifyRegistrationToken(mcpId: string, token: string): boolean {
    const expected = this.generateRegistrationToken(mcpId);
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  }

  // ── Registration ───────────────────────────────────────────────────────────

  async register(
    teamId: string,
    dto: RegisterMcpDto & {
      mcpId: string;
      registrationToken: string;
      capabilities?: string[];
      llmKeyId?: string;
    },
  ): Promise<McpServerRegistration> {
    if (!this.verifyRegistrationToken(dto.mcpId, dto.registrationToken)) {
      throw new UnauthorizedException(
        `Invalid registration token for mcpId "${dto.mcpId}"`,
      );
    }

    const validation = await this.validator.validate(dto.command, dto.envVars);
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.error}`);
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(dto.registrationToken)
      .digest('hex');

    let registration = await this.repo.findOne({ where: { mcpId: dto.mcpId } });

    if (!registration) {
      registration = this.repo.create({
        teamId,
        mcpId: dto.mcpId,
        name: dto.name,
        command: dto.command,
        envVars: dto.envVars,
        assignedTo: dto.assignedTo,
        capabilities: dto.capabilities ?? [],
        llmKeyId: dto.llmKeyId ?? null,
      });
    } else {
      Object.assign(registration, {
        name: dto.name,
        command: dto.command,
        envVars: dto.envVars,
        assignedTo: dto.assignedTo,
        capabilities: dto.capabilities ?? registration.capabilities,
        llmKeyId: dto.llmKeyId ?? registration.llmKeyId,
        revokedAt: null,
        revokeReason: null,
      });
    }

    registration.status = 'active';
    registration.toolsAvailable = validation.tools;
    registration.lastValidatedAt = new Date();
    registration.lastHeartbeatAt = new Date();
    registration.missedHeartbeats = 0;
    registration.validationError = null;
    registration.registrationTokenHash = tokenHash;

    return this.repo.save(registration);
  }

  // ── Heartbeat ──────────────────────────────────────────────────────────────

  async heartbeat(mcpId: string): Promise<void> {
    const reg = await this.repo.findOne({ where: { mcpId } });
    if (!reg || reg.status === 'revoked') return;

    await this.repo.update(reg.id, {
      lastHeartbeatAt: new Date(),
      missedHeartbeats: 0,
      status: 'active',
    });
  }

  @Cron('*/60 * * * * *')
  async checkStaleMcps(): Promise<void> {
    const all = await this.repo.find({
      where: [{ status: 'active' }, { status: 'stale' }],
    });

    const cutoff = new Date(Date.now() - HEARTBEAT_INTERVAL_MS * 1.5);

    for (const mcp of all) {
      if (!mcp.lastHeartbeatAt || mcp.lastHeartbeatAt < cutoff) {
        const missed = mcp.missedHeartbeats + 1;

        if (missed >= STALE_MISS_THRESHOLD) {
          await this.repo.update(mcp.id, {
            status: 'stale',
            missedHeartbeats: missed,
          });
          this.logger.warn(
            `MCP ${mcp.mcpId} marked STALE after ${missed} missed heartbeats`,
          );
          this.salesGateway.emitMcpServerFailed({
            teamId: mcp.teamId,
            serverId: mcp.id,
            serverName: mcp.name,
            error: `Stale: ${missed} missed heartbeats`,
          });
        } else {
          await this.repo.update(mcp.id, { missedHeartbeats: missed });
        }
      }
    }
  }

  // ── Revocation ─────────────────────────────────────────────────────────────

  async revoke(mcpId: string, reason?: string): Promise<void> {
    const reg = await this.repo.findOne({ where: { mcpId } });
    if (!reg) throw new NotFoundException(`MCP ${mcpId} not found`);
    await this.repo.update(reg.id, {
      status: 'revoked',
      revokedAt: new Date(),
      revokeReason: reason ?? 'revoked by Brain',
    });
    this.logger.warn(`MCP ${mcpId} revoked: ${reason}`);
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  async findActive(teamId?: string): Promise<McpServerRegistration[]> {
    const where: any = { status: 'active' };
    if (teamId) where.teamId = teamId;
    return this.repo.find({ where });
  }

  async findByMcpId(mcpId: string): Promise<McpServerRegistration | null> {
    return this.repo.findOne({ where: { mcpId } });
  }

  async refreshCapabilities(mcpId: string): Promise<void> {
    const reg = await this.repo.findOne({ where: { mcpId, status: 'active' } });
    if (!reg) return;

    // Re-use McpValidatorService.validate() — already opens stdio + calls list_tools
    const result = await this.validator.validate(reg.command, reg.envVars);
    if (!result.success) {
      this.logger.warn(
        `Capability refresh failed for ${mcpId}: ${result.error}`,
      );
      return; // keep existing toolsAvailable — don't wipe on transient failure
    }

    await this.repo.update(
      { mcpId },
      {
        toolsAvailable: result.tools,
        lastValidatedAt: new Date(),
      },
    );

    this.logger.log(
      `Refreshed capabilities for ${mcpId}: ${result.tools.join(', ')}`,
    );
  }

  @Cron('0 */2 * * *')
  async handleCapabilitiesRefresh() {
    this.logger.log('Starting background MCP capability refresh...');
    const active = await this.repo.find({ where: { status: 'active' } });

    await Promise.allSettled(
      active.map((server) => this.refreshCapabilities(server.mcpId)),
    );
  }

  async findByCapability(capability: string): Promise<McpServerRegistration[]> {
    return this.repo
      .createQueryBuilder('m')
      .where('m.status = :status', { status: 'active' as McpStatus })
      .andWhere(':cap = ANY(m.capabilities)', { cap: capability })
      .getMany();
  }

  async validateById(id: string): Promise<McpServerRegistration> {
    const registration = await this.repo.findOne({ where: { id } });
    if (!registration) throw new NotFoundException('Registration not found');

    const validation = await this.validator.validate(
      registration.command,
      registration.envVars,
    );

    registration.status = validation.success ? 'active' : 'failed';
    registration.toolsAvailable = validation.tools;
    registration.lastValidatedAt = new Date();
    registration.validationError = validation.error ?? null;

    return this.repo.save(registration);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async findAll(teamId: string): Promise<McpServerRegistration[]> {
    return this.repo.find({ where: { teamId } });
  }

  @Cron('0 0 * * *')
  async handleRevalidation() {
    this.logger.log('Starting background MCP re-validation...');
    const all = await this.repo.find({ where: { status: 'active' } });

    for (const server of all) {
      try {
        const updated = await this.validateById(server.id);
        if (updated.status === 'failed') {
          this.logger.warn(
            `MCP Server ${updated.name} failed re-validation: ${updated.validationError}`,
          );
          this.salesGateway.emitMcpServerFailed({
            teamId: updated.teamId,
            serverId: updated.id,
            serverName: updated.name,
            error:
              updated.validationError || 'Validation failed during daily check',
          });
        }
      } catch (e: any) {
        this.logger.error(
          `Error during re-validation of ${server.name} (serverId: ${server.id}): ${e?.message || String(e)}`,
          e instanceof Error ? e.stack : undefined,
        );
      }
    }
  }
}
