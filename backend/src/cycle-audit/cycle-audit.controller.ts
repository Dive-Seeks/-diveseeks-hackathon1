import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CycleAuditResult } from './entities/cycle-audit-result.entity';
import { CycleAuditService } from './cycle-audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cycle-audit')
export class CycleAuditController {
  constructor(
    @InjectRepository(CycleAuditResult)
    private readonly auditRepo: Repository<CycleAuditResult>,
    private readonly auditService: CycleAuditService,
  ) {}

  @Get('latest')
  @UseGuards(JwtAuthGuard)
  async getLatest() {
    return this.auditRepo.findOne({
      where: {},
      order: { ranAt: 'DESC' },
    });
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getHistory(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    const query = this.auditRepo
      .createQueryBuilder('audit')
      .orderBy('audit.ranAt', 'DESC')
      .take(Math.min(limit, 100));

    if (status) {
      query.andWhere('audit.overallStatus = :status', { status });
    }

    return query.getMany();
  }

  @Post('run')
  @UseGuards(JwtAuthGuard)
  async runAudit(@Req() req) {
    // Admin check could be added here if roles are implemented
    return this.auditService.runAuditCycle(req.user.tenantId);
  }
}
