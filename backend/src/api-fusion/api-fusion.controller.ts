import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { API_FUSION_QUEUE, ApiFusionJobs } from './api-fusion.queue';
import { ApiFusionBlueprint } from './entities/api-fusion-blueprint.entity';
import { ApiFusionCredential } from './entities/api-fusion-credential.entity';
import { ApiFusionMcpBridgeService } from './services/api-fusion-mcp-bridge.service';
import { ApiFusionExecutorService } from './services/api-fusion-executor.service';
import { CredentialVaultService } from './services/credential-vault.service';
import { NativeAdapterPromoterService } from './services/native-adapter-promoter.service';
import {
  ConnectApiDto,
  ApproveApiDto,
  ExecuteApiDto,
  SubmitCredentialsDto,
} from './dto/api-fusion.dto';

@Controller('api-fusion')
@UseGuards(JwtAuthGuard)
export class ApiFusionController {
  constructor(
    @InjectQueue(API_FUSION_QUEUE) private readonly queue: Queue,
    @InjectRepository(ApiFusionBlueprint)
    private readonly blueprintRepo: Repository<ApiFusionBlueprint>,
    @InjectRepository(ApiFusionCredential)
    private readonly credentialRepo: Repository<ApiFusionCredential>,
    private readonly mcpBridge: ApiFusionMcpBridgeService,
    private readonly executor: ApiFusionExecutorService,
    private readonly vault: CredentialVaultService,
    private readonly nativePromoter: NativeAdapterPromoterService,
  ) {}

  private readonly logger = new Logger(ApiFusionController.name);

  @Post('connect')
  async connect(@Req() req: any, @Body() dto: ConnectApiDto) {
    const user = req.user;
    this.logger.log(
      `Received connection request for provider: ${dto.provider} from tenant: ${user.tenantId}`,
    );
    // 1. Create a "discovering" blueprint
    const blueprint = this.blueprintRepo.create({
      tenantId: user.tenantId,
      provider: dto.provider.toLowerCase(),
      status: 'discovering',
    });
    const saved = await this.blueprintRepo.save(blueprint);

    // 2. Start the pipeline
    await this.queue.add(ApiFusionJobs.MCP_CHECK, {
      blueprintId: saved.id,
      tenantId: user.tenantId,
      provider: dto.provider,
      specUrl: dto.specUrl,
    });

    return {
      message: 'Connection pipeline started',
      blueprintId: saved.id,
    };
  }

  @Get('status/:blueprintId')
  async getStatus(@Req() req: any, @Param('blueprintId') id: string) {
    const blueprint = await this.blueprintRepo.findOne({
      where: { id, tenantId: req.user.tenantId },
    });
    if (!blueprint) throw new NotFoundException('Blueprint not found');
    return blueprint;
  }

  @Post('credentials')
  async submitCredentials(@Req() req: any, @Body() dto: SubmitCredentialsDto) {
    const tenantId = req.user.tenantId;

    // Verify blueprint belongs to this tenant and is awaiting credentials
    const blueprint = await this.blueprintRepo.findOne({
      where: { id: dto.blueprintId, tenantId },
    });
    if (!blueprint) throw new NotFoundException('Blueprint not found');
    if (
      !['awaiting_credentials', 'pending_approval'].includes(blueprint.status)
    ) {
      throw new BadRequestException(
        `Blueprint is not awaiting credentials (status: ${blueprint.status})`,
      );
    }

    // Encrypt and store credentials
    const encrypted = this.vault.encrypt(tenantId, dto.credentials);

    // Upsert credential record
    const existing = await this.credentialRepo.findOne({
      where: { tenantId, blueprintId: dto.blueprintId },
    });

    if (existing) {
      await this.credentialRepo.update(existing.id, {
        encryptedCredentials: encrypted,
        authStatus: 'valid',
        lastVerifiedAt: new Date(),
      });
    } else {
      await this.credentialRepo.save({
        tenantId,
        blueprintId: dto.blueprintId,
        encryptedCredentials: encrypted,
        authStatus: 'valid',
        lastVerifiedAt: new Date(),
      });
    }

    // For native MCP path: advance status to pending_approval
    if (blueprint.status === 'awaiting_credentials') {
      await this.blueprintRepo.update(dto.blueprintId, {
        status: 'pending_approval',
      });
    }

    return { message: 'Credentials stored and encrypted successfully' };
  }

  @Post('approve')
  async approve(@Req() req: any, @Body() dto: ApproveApiDto) {
    const tenantId = req.user.tenantId;
    const blueprint = await this.blueprintRepo.findOne({
      where: { id: dto.blueprintId, tenantId },
    });
    if (!blueprint) throw new NotFoundException('Blueprint not found');
    if (blueprint.status !== 'pending_approval') {
      throw new BadRequestException(
        `Blueprint cannot be approved in status: ${blueprint.status}`,
      );
    }

    await this.blueprintRepo.update(blueprint.id, { status: 'active' });

    // Reload after update so registerBlueprintTools sees status='active'
    const updatedBlueprint = await this.blueprintRepo.findOne({
      where: { id: blueprint.id },
    });
    await this.mcpBridge.registerBlueprintTools(updatedBlueprint!, tenantId);

    return { message: 'Integration activated and MCP tools registered' };
  }

  @Post('execute')
  async execute(@Req() req: any, @Body() dto: ExecuteApiDto) {
    return await this.executor.call(
      req.user.tenantId,
      dto.provider,
      dto.endpoint,
      dto.payload,
      'frontend',
    );
  }

  @Get('vault/global')
  async getGlobalVault() {
    return await this.blueprintRepo.find({
      where: { isGlobal: true, status: 'active' },
    });
  }

  @Get('vault')
  async getVault(@Req() req: any) {
    return await this.blueprintRepo.find({
      where: { tenantId: req.user.tenantId, status: 'active' },
    });
  }

  @Get('tools')
  async getTools(@Req() req: any) {
    return this.mcpBridge.getToolsForTenant(req.user.tenantId);
  }

  @Post('promote/:blueprintId')
  async promote(@Req() req: any, @Param('blueprintId') blueprintId: string) {
    return this.nativePromoter.promote(blueprintId, req.user.tenantId);
  }
}
