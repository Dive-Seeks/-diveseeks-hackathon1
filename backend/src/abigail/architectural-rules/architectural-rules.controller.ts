import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectTierService } from './project-tier.service';
import { ArchitecturalRulesEngine } from './architectural-rules.engine';
import { ArchitecturalRulesLoaderService } from './architectural-rules-loader.service';
import { DeclareProjectTierDto } from './dto/declare-project-tier.dto';
import { ConfirmArchitecturalOverrideDto } from './dto/confirm-architectural-override.dto';
import { CreateArchitecturalRuleDto } from './dto/create-architectural-rule.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArchitecturalVerdict } from './entities/architectural-verdict.entity';
import { ArchitecturalOverride } from './entities/architectural-override.entity';
import { GlobalArchitecturalRule } from './entities/global-architectural-rule.entity';
import { SessionBridgeService } from '../../memory/session-bridge.service';

@Controller('abigail')
@UseGuards(JwtAuthGuard)
export class ArchitecturalRulesController {
  private readonly logger = new Logger(ArchitecturalRulesController.name);

  constructor(
    private readonly tierService: ProjectTierService,
    private readonly engine: ArchitecturalRulesEngine,
    private readonly loader: ArchitecturalRulesLoaderService,
    private readonly sessionBridge: SessionBridgeService,
    @InjectRepository(ArchitecturalVerdict)
    private readonly verdictRepo: Repository<ArchitecturalVerdict>,
    @InjectRepository(ArchitecturalOverride)
    private readonly overrideRepo: Repository<ArchitecturalOverride>,
    @InjectRepository(GlobalArchitecturalRule)
    private readonly globalRuleRepo: Repository<GlobalArchitecturalRule>,
  ) {}

  @Post('projects/:projectId/tier')
  async declareTier(
    @Param('projectId') projectId: string,
    @Body() dto: DeclareProjectTierDto,
    @Request() req: any,
  ) {
    const tenantId: string = req.user.tenantId;
    const result = await this.tierService.declareTier(projectId, tenantId, dto);
    return { data: result, statusCode: 201 };
  }

  @Get('projects/:projectId/tier')
  async getTier(@Param('projectId') projectId: string, @Request() req: any) {
    const tenantId: string = req.user.tenantId;
    const result = await this.tierService.getTier(projectId, tenantId);
    return { data: result, statusCode: 200 };
  }

  @Post('projects/:projectId/tier/promote')
  async promoteTier(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    const tenantId: string = req.user.tenantId;
    const result = await this.tierService.promote(projectId, tenantId);
    return { data: result, statusCode: 200 };
  }

  @Post('projects/:projectId/overrides')
  async confirmOverride(
    @Param('projectId') projectId: string,
    @Body() dto: ConfirmArchitecturalOverrideDto,
    @Request() req: any,
  ) {
    const tenantId: string = req.user.tenantId;
    const sessionId = 'manual';
    const result = await this.engine.logOverride(
      projectId,
      tenantId,
      sessionId,
      dto.ruleId,
      dto.reason,
    );
    // Fetch the matched rule so we have domain + tier for the bridge
    const rules = await this.loader.getMergedRules();
    const rule = rules.find((r) => r.ruleId === dto.ruleId);
    const { tier } = await this.tierService.getTier(projectId, tenantId);
    this.sessionBridge
      .bridgeArchitecturalVerdict({
        tenantId,
        projectId,
        ruleId: dto.ruleId,
        domain: rule?.domain ?? 'unknown',
        projectTier: tier,
        developerReason: dto.reason,
      })
      .catch((e) =>
        this.logger.warn(`Arch verdict bridge failed: ${(e as Error).message}`),
      );
    return { data: result, statusCode: 201 };
  }

  @Get('projects/:projectId/overrides')
  async listOverrides(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    const tenantId: string = req.user.tenantId;
    const overrides = await this.overrideRepo.find({
      where: { projectId, tenantId, resolvedAt: null as any },
      order: { createdAt: 'DESC' },
    });
    return { data: overrides, statusCode: 200 };
  }

  @Delete('projects/:projectId/overrides/:overrideId')
  @HttpCode(HttpStatus.OK)
  async resolveOverride(
    @Param('projectId') projectId: string,
    @Param('overrideId') overrideId: string,
    @Request() req: any,
  ) {
    const tenantId: string = req.user.tenantId;
    const override = await this.overrideRepo.findOne({
      where: { id: overrideId, projectId, tenantId },
    });
    if (!override)
      throw new NotFoundException(`Override ${overrideId} not found`);
    override.resolvedAt = new Date();
    await this.overrideRepo.save(override);
    await this.engine.resolveOverride(overrideId, projectId, override.ruleId);
    return { data: { resolved: true }, statusCode: 200 };
  }

  @Get('architectural-rules')
  async listRules() {
    const rules = await this.loader.getMergedRules();
    return { data: rules, statusCode: 200 };
  }

  @Get('projects/:projectId/applicable-rules')
  async applicableRules(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    const tenantId: string = req.user.tenantId;
    const { tier, tierValue } = await this.tierService.getTier(
      projectId,
      tenantId,
    );
    const allRules = await this.loader.getMergedRules();
    const applicable = allRules.filter(
      (r) => tierValue >= r.minTier && tierValue <= r.maxTier,
    );
    return { data: { tier, tierValue, rules: applicable }, statusCode: 200 };
  }

  @Post('architectural-rules')
  async createRule(@Body() dto: CreateArchitecturalRuleDto) {
    const existing = await this.globalRuleRepo.findOne({
      where: { ruleId: dto.ruleId },
    });
    if (existing) {
      await this.globalRuleRepo.update({ ruleId: dto.ruleId }, dto as any);
    } else {
      await this.globalRuleRepo.insert({
        ...(dto as any),
        source: 'manual',
        isActive: true,
      });
    }
    const saved = await this.globalRuleRepo.findOne({
      where: { ruleId: dto.ruleId },
    });
    await this.loader.invalidateCache();
    return { data: saved, statusCode: 201 };
  }

  @Patch('architectural-rules/:ruleId')
  async updateRule(
    @Param('ruleId') ruleId: string,
    @Body() dto: Partial<CreateArchitecturalRuleDto>,
  ) {
    await this.globalRuleRepo.update({ ruleId }, dto as any);
    await this.loader.invalidateCache();
    return { data: { updated: true }, statusCode: 200 };
  }

  @Get('projects/:projectId/verdicts')
  async listVerdicts(
    @Param('projectId') projectId: string,
    @Query('domain') domain: string,
    @Query('outcome') outcome: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Request() req: any,
  ) {
    const tenantId: string = req.user.tenantId;
    const where: Record<string, unknown> = { projectId, tenantId };
    if (domain) where['domain'] = domain;
    if (outcome) where['outcome'] = outcome;
    const [items, total] = await this.verdictRepo.findAndCount({
      where: where,
      order: { createdAt: 'DESC' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });
    return { data: { items, total }, statusCode: 200 };
  }
}
