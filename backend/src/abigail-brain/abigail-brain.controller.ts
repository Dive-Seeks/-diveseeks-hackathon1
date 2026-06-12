import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AbigailBrainService } from './abigail-brain.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OpenSessionDto } from './dto/open-session.dto';
import { AddIdeaDto } from './dto/add-idea.dto';
import { ForkThreadDto } from './dto/fork-thread.dto';

@Controller('abigail-brain')
@UseGuards(JwtAuthGuard)
export class AbigailBrainController {
  constructor(private readonly brainService: AbigailBrainService) {}

  @Post('sessions')
  async open(@Body() dto: OpenSessionDto, @Req() req: any) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    return this.brainService.session.open({
      topic: dto.topic,
      intentType: dto.intentType,
      tenantId: tenantId,
      userId: req.user.userId,
    });
  }

  @Get('sessions/active')
  async getActive(@Req() req: any) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    return this.brainService.session.getActive(tenantId, req.user.userId);
  }

  @Get('sessions/:id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    return this.brainService.session.findOne(id, tenantId);
  }

  @Post('sessions/:id/ideas')
  async addIdea(
    @Param('id') id: string,
    @Body() dto: AddIdeaDto,
    @Req() req: any,
  ) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    return this.brainService.session.addIdea(
      id,
      tenantId,
      dto.content,
      dto.batchNumber,
    );
  }

  @Post('sessions/:id/fork')
  async fork(
    @Param('id') id: string,
    @Body() dto: ForkThreadDto,
    @Req() req: any,
  ) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    return this.brainService.session.fork(id, tenantId, dto.name, dto.topic);
  }

  @Post('sessions/:id/back')
  async back(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    return this.brainService.session.back(id, tenantId);
  }

  @Post('sessions/:id/complete')
  async complete(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    return this.brainService.session.complete(id, tenantId);
  }

  @Get('sessions/:id/summary')
  async getSummary(@Param('id') id: string, @Req() req: any) {
    const tenantId = req.user.tenantId || req.user.tenant_id;
    const session = await this.brainService.session.findOne(id, tenantId);
    return { summary: session.summary };
  }
}
