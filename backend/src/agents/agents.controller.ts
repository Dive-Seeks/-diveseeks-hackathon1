import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantClsService } from '../common/cls/tenant-cls.service';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { HireAgentDto } from './dto/hire-agent.dto';

@ApiTags('Agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly tenantCls: TenantClsService,
  ) {}

  @Post()
  create(@Body() dto: CreateAgentDto) {
    return this.agentsService.create(dto);
  }

  @Get()
  @ApiQuery({ name: 'tenantId', required: false })
  findAll(@Query('tenantId') tenantId?: string) {
    return this.agentsService.findAll(tenantId);
  }

  @Get('org-chart')
  getOrgChart() {
    return this.agentsService.getOrgChart();
  }

  @Get('coordinator/scope')
  getCoordinatorScope() {
    return this.agentsService.getCoordinatorScope(this.tenantCls.getTenantId());
  }

  @Get('check-name')
  async checkName(
    @Query('name') name: string,
    @Query('excludeId') excludeId?: string,
  ) {
    if (!name?.trim()) throw new BadRequestException('name is required');
    const available = await this.agentsService.isCoordinatorNameAvailable(
      name.trim(),
      excludeId,
    );
    return { available };
  }

  @Get('custom')
  @ApiQuery({ name: 'team', required: false })
  getCustomAgents(@Query('team') team?: string) {
    const tenantId = this.tenantCls.getTenantId();
    return this.agentsService.findCustomAgents(tenantId ?? '', team);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.findOne(id);
  }

  @Get(':id/direct-reports')
  getDirectReports(@Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.getDirectReports(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAgentDto) {
    const tenantId = this.tenantCls.getTenantId()!;
    return this.agentsService.update(id, tenantId, dto);
  }

  /** hiredByAgentId comes from JWT — never from request body (Rule 19) */
  @Post('hire')
  hire(@Body() dto: HireAgentDto) {
    const hiredByAgentId = this.tenantCls.getUserId() ?? 'system';
    return this.agentsService.hire(dto, hiredByAgentId);
  }

  @Post(':id/terminate')
  terminate(@Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.terminate(id);
  }
}
