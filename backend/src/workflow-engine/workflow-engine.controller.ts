import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkflowExecutorService } from './services/workflow-executor.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowExecution } from './entities/workflow-execution.entity';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowStepExecution } from './entities/workflow-step-execution.entity';

export class StartWorkflowDto {
  name: string;
  state?: Record<string, any>;
}

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowEngineController {
  constructor(
    private readonly executor: WorkflowExecutorService,
    @InjectRepository(WorkflowExecution)
    private readonly executionRepo: Repository<WorkflowExecution>,
    @InjectRepository(WorkflowDefinition)
    private readonly definitionRepo: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowStepExecution)
    private readonly stepExecRepo: Repository<WorkflowStepExecution>,
  ) {}

  @Get('definitions')
  listDefinitions(@Req() req: any) {
    return this.definitionRepo.find({
      where: [{ tenantId: req.user.tenantId }, { tenantId: null }],
      order: { updatedAt: 'DESC' },
    });
  }

  @Post('start')
  start(@Req() req: any, @Body() dto: StartWorkflowDto) {
    return this.executor.startWorkflow(
      dto.name,
      dto.state ?? {},
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Get('executions')
  listExecutions(@Req() req: any) {
    return this.executionRepo.find({
      where: { tenantId: req.user.tenantId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  @Get('executions/:id')
  getExecution(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.executionRepo.findOne({
      where: { id, tenantId: req.user.tenantId },
    });
  }

  @Get('executions/:id/steps')
  getSteps(@Param('id', ParseUUIDPipe) id: string) {
    return this.stepExecRepo.find({
      where: { executionId: id },
      order: { createdAt: 'ASC' },
    });
  }
}
