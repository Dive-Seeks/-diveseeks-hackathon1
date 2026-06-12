import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AbigailService } from '../abigail/abigail.service';
import {
  MarketplaceListing,
  AssetType,
} from '../marketplace/entities/marketplace-listing.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Processor('a2a-runner')
export class A2ARunnerProcessor extends WorkerHost {
  private readonly logger = new Logger(A2ARunnerProcessor.name);

  constructor(
    private readonly abigailService: AbigailService,
    @InjectRepository(MarketplaceListing)
    private readonly listingRepo: Repository<MarketplaceListing>,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    const { slug, task, tenantId, userId } = job.data;

    this.logger.log(`[A2A] Processing task for ${slug} (tenant: ${tenantId})`);

    const listing = await this.listingRepo.findOne({ where: { slug } });
    if (!listing) throw new Error(`Listing ${slug} not found`);

    if (listing.assetType !== AssetType.AGENT) {
      throw new Error(`Listing ${slug} is not an AGENT`);
    }

    const projectId = listing.assetId;
    if (!projectId)
      throw new Error(`Listing ${slug} has no associated projectId`);

    // Cross-tenant execution logic
    // We execute the task using AbigailService within the context of the CALLER's tenantId/userId,
    // but targeted at the AGENT's project (assetId).
    const result = await this.abigailService.handleRequest({
      projectId,
      message: task,
      teamId: tenantId,
      userId: userId,
    });

    return result;
  }
}
