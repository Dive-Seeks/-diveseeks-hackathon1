import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditOrchestratorService } from './services/audit-orchestrator.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditLoop,
  AuditFinding,
  AuditArtifact,
} from './entities/audit-loop.entity';

@Controller('audit-loop')
@UseGuards(JwtAuthGuard)
export class AuditLoopController {
  constructor(
    private readonly orchestrator: AuditOrchestratorService,
    @InjectRepository(AuditLoop)
    private readonly loopRepo: Repository<AuditLoop>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    @InjectRepository(AuditArtifact)
    private readonly artifactRepo: Repository<AuditArtifact>,
  ) {}

  @Post('start')
  async startLoop(@Body('request') request: string, @Req() req: any) {
    return this.orchestrator.startLoop(
      request,
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Get(':id')
  async getStatus(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.loopRepo.findOne({
      where: { id, tenantId: req.user.tenantId },
    });
  }

  @Get(':id/findings')
  async getFindings(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.findingRepo.find({
      where: { loopId: id },
      order: { round: 'DESC' },
    });
  }

  @Get(':id/artifacts')
  async getArtifacts(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.artifactRepo.find({
      where: { loopId: id },
      order: { round: 'ASC' },
    });
  }
}
