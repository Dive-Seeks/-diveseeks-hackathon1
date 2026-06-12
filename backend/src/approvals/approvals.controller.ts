import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { ApprovalDecisionDto } from './dto/approval-decision.dto';

@ApiTags('Approvals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post()
  create(@Body() dto: CreateApprovalDto) {
    return this.approvalsService.create(dto);
  }

  @Get()
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.approvalsService.findAll(tenantId, status, page, limit);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.approvalsService.findOne(id);
  }

  @Post(':id/decide')
  decide(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApprovalDecisionDto & { resolvedByAgentId: string },
  ) {
    const { resolvedByAgentId, ...decisionDto } = dto;
    return this.approvalsService.decide(id, decisionDto, resolvedByAgentId);
  }

  @Post(':id/resubmit')
  resubmit(@Param('id', ParseUUIDPipe) id: string) {
    return this.approvalsService.resubmit(id);
  }
}
