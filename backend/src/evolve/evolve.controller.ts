import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Req,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantClsService } from '../common/cls/tenant-cls.service';
import { EvolveOrchestrator } from './evolve-orchestrator.service';
import { MetaOptimizerService } from './meta-optimizer.service';
import { HarnessCandidate } from './entities/harness-candidate.entity';
import { SpecialistModelOverride } from './entities/specialist-model-override.entity';
import { DegradedOutput } from './entities/degraded-output.entity';
import { TriggerEvolutionDto } from './dto/trigger-evolution.dto';

import { TriggerMetaOptimizationDto } from './dto/trigger-meta-optimization.dto';
import { SetModelConfigDto } from './dto/set-model-config.dto';

@Controller('evolve')
export class EvolveController {
  constructor(
    private readonly evolveOrchestrator: EvolveOrchestrator,
    private readonly metaOptimizer: MetaOptimizerService,
    private readonly tenantCls: TenantClsService,
    @InjectRepository(SpecialistModelOverride)
    private readonly overrideRepo: Repository<SpecialistModelOverride>,
    @InjectRepository(DegradedOutput)
    private readonly degradedRepo: Repository<DegradedOutput>,
  ) {}

  @Post('trigger')
  async triggerEvolution(@Body() dto: TriggerEvolutionDto, @Req() req: any) {
    if (process.env.NODE_ENV === 'production') {
      const expected = process.env.EVOLVE_SECRET;
      if (!expected || dto.secret !== expected) {
        throw new ForbiddenException('Invalid evolution secret');
      }
    }

    const tenantId = this.tenantCls.getTenantId() ?? 'global';
    this.evolveOrchestrator
      .runCycle(dto.specialistId, tenantId)
      .catch((err) => console.error('Manual evolution trigger failed', err));

    return {
      message: 'Evolution cycle triggered',
      specialistId: dto.specialistId,
      tenantId,
    };
  }

  @Get(':specialistId/convergence')
  async getConvergence(@Param('specialistId') specialistId: string) {
    const tenantId = this.tenantCls.getTenantId() ?? 'global';
    return this.evolveOrchestrator.computeConvergence(specialistId, tenantId);
  }

  @Post('meta-optimize')
  async triggerMetaOptimization(@Body() dto: TriggerMetaOptimizationDto) {
    if (process.env.NODE_ENV === 'production') {
      const expected = process.env.EVOLVE_SECRET;
      if (!expected || dto.secret !== expected) {
        throw new ForbiddenException('Invalid evolution secret');
      }
    }

    const tenantId = this.tenantCls.getTenantId() ?? 'global';
    this.metaOptimizer
      .runMetaOptimization(tenantId)
      .catch((err) => console.error('Meta-optimization trigger failed', err));

    return {
      message: 'Meta-optimization cycle triggered',
      tenantId,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('meta-optimizer/history')
  async getHistory(): Promise<HarnessCandidate[]> {
    return this.metaOptimizer.getHistory(this.tenantCls.getTenantId()!);
  }

  @UseGuards(JwtAuthGuard)
  @Get('meta-optimizer/active')
  async getActiveCandidate(): Promise<HarnessCandidate | null> {
    return this.metaOptimizer.getActiveCandidate(this.tenantCls.getTenantId()!);
  }

  @UseGuards(JwtAuthGuard)
  @Get('specialists/:specialistId/model-config')
  async getModelConfig(
    @Param('specialistId') specialistId: string,
  ): Promise<SpecialistModelOverride | null> {
    return (
      this.overrideRepo.findOne({
        where: { tenantId: this.tenantCls.getTenantId()!, specialistId },
      }) ?? null
    );
  }

  @UseGuards(JwtAuthGuard)
  @Put('specialists/:specialistId/model-config')
  async setModelConfig(
    @Param('specialistId') specialistId: string,
    @Body() dto: SetModelConfigDto,
  ): Promise<SpecialistModelOverride> {
    const tenantId = this.tenantCls.getTenantId()!;
    const existing = await this.overrideRepo.findOne({
      where: { tenantId, specialistId },
    });
    const entity =
      existing ?? this.overrideRepo.create({ tenantId, specialistId });
    entity.provider = dto.provider;
    entity.model = dto.model;
    entity.reason = dto.reason ?? null;
    entity.apiKeyEncrypted = null;
    return this.overrideRepo.save(entity);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('specialists/:specialistId/model-config')
  async deleteModelConfig(
    @Param('specialistId') specialistId: string,
  ): Promise<{ success: boolean }> {
    await this.overrideRepo.delete({
      tenantId: this.tenantCls.getTenantId()!,
      specialistId,
    });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('degraded-audit')
  async getDegradedAudit(): Promise<DegradedOutput[]> {
    return this.degradedRepo.find({
      where: { tenantId: this.tenantCls.getTenantId()! },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
