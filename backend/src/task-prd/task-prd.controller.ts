import {
  Controller,
  Post,
  Patch,
  Get,
  Param,
  Query,
  Body,
  UseGuards,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskPrdFeatureMap } from './entities/task-prd-feature-map.entity';
import { TaskPrdRequirement } from './entities/task-prd-requirement.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { SalesGateway } from '../gateways/sales/sales.gateway';

@Controller('task-prd')
@UseGuards(JwtAuthGuard)
export class TaskPrdController {
  private readonly logger = new Logger(TaskPrdController.name);

  constructor(
    @InjectRepository(TaskPrdFeatureMap)
    private readonly mapRepo: Repository<TaskPrdFeatureMap>,
    @InjectRepository(TaskPrdRequirement)
    private readonly reqRepo: Repository<TaskPrdRequirement>,
    private readonly salesGateway: SalesGateway,
  ) {}

  @Get('feature-maps')
  async getFeatureMaps(
    @CurrentTenant() tenantId: string,
    @Query('projectId') projectId?: string,
  ) {
    const where: Record<string, string> = { tenantId };
    if (projectId) {
      where['taskSessionId'] = projectId;
    }
    const maps = await this.mapRepo.find({
      where,
      select: ['id', 'status', 'createdAt'],
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const active = maps.filter(
      (m) => m.status === 'running' || m.status === 'pending',
    ).length;
    return { total: maps.length, active };
  }

  @Get('sessions/:sessionId')
  async getSessionStatus(
    @CurrentTenant() tenantId: string,
    @Param('sessionId') sessionId: string,
  ) {
    const featureMap = await this.mapRepo.findOne({
      where: { taskSessionId: sessionId, tenantId },
    });
    if (!featureMap) {
      throw new NotFoundException(
        `No feature map found for session ${sessionId}`,
      );
    }

    const reqs = await this.reqRepo.find({
      where: { featureMapId: featureMap.id },
      order: { iterationNumber: 'DESC' },
    });

    // De-duplicate by requirementId
    const seen = new Set<string>();
    const latestReqs = reqs.filter((r) => {
      if (seen.has(r.requirementId)) return false;
      seen.add(r.requirementId);
      return true;
    });

    return { success: true, data: { featureMap, requirements: latestReqs } };
  }

  @Post('review-needed')
  @Post('/qa/review-needed')
  async reviewNeeded(@CurrentTenant() tenantId: string, @Body() dto: any) {
    const prd = await this.mapRepo.findOne({
      where: { id: dto.prdFeatureMapId },
    });
    if (!prd) throw new NotFoundException('Not found');

    this.salesGateway.server.emit('test_review_needed', {
      taskSessionId: dto.taskSessionId,
      taskSlug: prd.taskSlug,
      prdFeatureMapId: prd.id,
      prdVersion: prd.version,
      goal: prd.goal,
      failingRequirements: dto.failingRequirements,
    });
    return { success: true, data: [] };
  }

  @Patch('prd/:id')
  @Patch('/qa/prd/:id')
  async updatePrd(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: { humanNotes: string },
  ) {
    const prd = await this.mapRepo.findOne({ where: { id, tenantId } });
    if (!prd) throw new NotFoundException('Not found');

    prd.humanNotes = dto.humanNotes;
    prd.version += 1;
    await this.mapRepo.save(prd);
    return { success: true, data: prd };
  }

  @Post('human-watch-start')
  @Post('/qa/human-watch-start')
  async humanWatchStart(@CurrentTenant() tenantId: string, @Body() dto: any) {
    this.salesGateway.emitHumanActionNeeded({
      taskSessionId: dto.taskSessionId,
      requirementId: dto.requirementId,
      requirementText: 'Action required',
      instruction: 'Please perform the action.',
      watchingFor: dto.watchSelectors || [],
      timeoutMs: 120000,
    });
    return { success: true, data: {} };
  }

  @Post('human-watch-complete')
  @Post('/qa/human-watch-complete')
  async humanWatchComplete(
    @CurrentTenant() tenantId: string,
    @Body() dto: any,
  ) {
    return { success: true, data: {} };
  }

  @Post('requirements/:id/approve')
  async approveRequirement(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    const req = await this.reqRepo.findOne({ where: { id, tenantId } });
    if (!req) throw new NotFoundException('Not found');
    req.status = 'human_pass';
    req.satisfied = true;
    await this.reqRepo.save(req);
    return { success: true, data: req };
  }

  @Post('requirements/:id/reject')
  async rejectRequirement(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: { humanNote: string },
  ) {
    const req = await this.reqRepo.findOne({ where: { id, tenantId } });
    if (!req) throw new NotFoundException('Not found');
    req.status = 'fail';
    req.satisfied = false;
    req.humanNote = dto.humanNote;
    await this.reqRepo.save(req);
    return { success: true, data: req };
  }
}
