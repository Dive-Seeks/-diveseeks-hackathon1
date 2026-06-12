import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DeepReasoningService } from './deep-reasoning.service';
import { KnowledgeStoreService } from '../../knowledge-store/knowledge-store.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('deep-reasoning')
@UseGuards(JwtAuthGuard)
export class DeepReasoningController {
  constructor(
    private readonly deepReasoningService: DeepReasoningService,
    private readonly knowledgeStoreService: KnowledgeStoreService,
    @InjectQueue('knowledge-synthesis') private readonly synthesisQueue: Queue,
  ) {}

  @Post('research')
  async triggerResearch(@Body() body: { query: string; tenantId?: string }) {
    const result = await this.deepReasoningService.reason({
      taskDescription: body.query,
      tenantId: body.tenantId || null,
      taskSessionId: null,
      triggerType: 'on_demand',
    });
    return { jobId: result.researchJobId, source: result.source };
  }

  @Get('research/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.deepReasoningService.getJobStatus(jobId);
  }

  @Get('search')
  async searchKnowledge(
    @Query('q') query: string,
    @Query('tenantId') tenantId?: string,
    @Query('maxTokens') maxTokens?: number,
  ) {
    const results = await this.knowledgeStoreService.search(
      query,
      tenantId || null,
      maxTokens ? Number(maxTokens) : 2000,
    );
    return results;
  }

  @Delete('knowledge/:chunkId')
  async deleteKnowledge(@Param('chunkId') chunkId: string) {
    await this.knowledgeStoreService.softDelete(chunkId);
    return { success: true };
  }

  @Post('synthesize/trigger')
  async triggerSynthesis() {
    await this.synthesisQueue.add('run', {});
    return { queued: true };
  }
}
