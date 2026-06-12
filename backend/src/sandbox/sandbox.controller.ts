import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { SandboxExecutorService } from './sandbox-executor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { SandboxSession } from './entities/sandbox-session.entity';
import { Repository } from 'typeorm';

@Controller('sandbox')
@UseGuards(JwtAuthGuard)
export class SandboxController {
  constructor(
    private readonly sandboxService: SandboxExecutorService,
    @InjectRepository(SandboxSession)
    private readonly sessionRepo: Repository<SandboxSession>,
  ) {}

  @Post('sessions')
  async createSession(@Body() body: any, @Req() req) {
    return this.sandboxService.createSession(req.user.tenantId, body);
  }

  @Post('sessions/:id/exec')
  async exec(
    @Param('id') id: string,
    @Body() body: { command: string; timeoutMs?: number },
    @Req() req,
  ) {
    // Verify ownership
    await this.sessionRepo.findOneOrFail({
      where: { id, tenantId: req.user.tenantId },
    });
    return this.sandboxService.exec(id, body.command, {
      timeoutMs: body.timeoutMs,
    });
  }

  @Post('sessions/:id/resume')
  async resume(@Param('id') id: string, @Req() req) {
    await this.sessionRepo.findOneOrFail({
      where: { id, tenantId: req.user.tenantId },
    });
    return this.sandboxService.resumeSession(id);
  }

  @Delete('sessions/:id')
  async close(@Param('id') id: string, @Req() req) {
    await this.sessionRepo.findOneOrFail({
      where: { id, tenantId: req.user.tenantId },
    });
    await this.sandboxService.closeSession(id);
    return { success: true };
  }

  @Get('sessions')
  async list(
    @Req() req,
    @Query('limit') limit = 10,
    @Query('offset') offset = 0,
  ) {
    return this.sessionRepo.find({
      where: { tenantId: req.user.tenantId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  @Get('sessions/:id')
  async get(@Param('id') id: string, @Req() req) {
    return this.sessionRepo.findOneOrFail({
      where: { id, tenantId: req.user.tenantId },
    });
  }
}
