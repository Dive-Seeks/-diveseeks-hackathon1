import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { WebResearchService } from './web-research.service';
import { SalesGateway } from '../gateways/sales/sales.gateway';

@Processor('web-research-global')
export class WebResearchProcessor extends WorkerHost {
  private readonly logger = new Logger(WebResearchProcessor.name);

  constructor(
    private readonly webResearchService: WebResearchService,
    private readonly salesGateway: SalesGateway,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<void> {
    const { query, tenantId, jobId } = job.data;
    this.logger.log(
      `Processing web-research job ${job.id} (jobId: ${jobId}) for query: ${query}`,
    );

    try {
      // Emit research_started
      this.salesGateway.server.emit('research_started', {
        jobId,
        query,
        tenantId,
      });

      const result = await this.webResearchService.research(
        query,
        tenantId,
        jobId,
        job.data.domain,
      );

      // Emit research_complete
      this.salesGateway.server.emit('research_complete', {
        jobId,
        query,
        tenantId,
        chunksIndexed: result.chunksIndexed,
        totalTokens: result.totalTokens,
      });

      this.logger.log(`Web-research job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Web-research job ${job.id} failed: ${error.message}`,
        error.stack,
      );

      // Emit research_failed
      this.salesGateway.server.emit('research_failed', {
        jobId,
        error: error.message,
        tenantId,
      });

      throw error;
    }
  }
}
