import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgentSessionsService } from './agent-sessions.service';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RejectSessionDto {
  @IsString() @IsNotEmpty() reason: string;
}

export class PatchSessionDto {
  @IsOptional() domainContext?: object;
  @IsOptional() pendingApproval?: object;
}

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class AgentSessionsController {
  constructor(private readonly sessions: AgentSessionsService) {}

  @Get()
  list(@Req() req: any) {
    return this.sessions.listActive(req.user.tenantId);
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() req: any) {
    return this.sessions.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  patch(
    @Param('id') id: string,
    @Body() dto: PatchSessionDto,
    @Req() req: any,
  ) {
    return this.sessions.patch(id, req.user.tenantId, dto);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Req() req: any) {
    return this.sessions.approve(id, req.user.tenantId);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectSessionDto,
    @Req() req: any,
  ) {
    return this.sessions.reject(id, req.user.tenantId, dto.reason);
  }

  @Post(':id/heartbeat')
  heartbeat(@Param('id') id: string, @Req() req: any) {
    return this.sessions.heartbeat(id, req.user.tenantId);
  }
}
