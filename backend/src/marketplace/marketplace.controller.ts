import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ListingService } from './services/listing.service';
import { AgentCardService } from './services/agent-card.service';
import { A2ARunnerService } from '../a2a-runner/a2a-runner.service';
import {
  CreateListingDto,
  PublishVersionDto,
  InstallDto,
  CreateReviewDto,
  QueryListingsDto,
} from './dto/marketplace.dto';

@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly listingService: ListingService,
    private readonly agentCard: AgentCardService,
    private readonly a2aRunner: A2ARunnerService,
  ) {}

  @Get()
  query(@Query() query: QueryListingsDto) {
    return this.listingService.query(query);
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.listingService.findOne(slug);
  }

  @Get(':slug/versions')
  async listVersions(@Param('slug') slug: string) {
    const listing = await this.listingService.findOne(slug);
    return this.listingService.listVersions(listing.id);
  }

  @Get(':slug/agent-card')
  async agentCardJson(@Param('slug') slug: string, @Req() req: any) {
    const listing = await this.listingService.findOne(slug);
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.agentCard.generate(listing, baseUrl);
  }

  // --- A2A Runner Aliases (Agent Card Backing) ---

  @Post(':slug/invoke')
  @HttpCode(202)
  @UseGuards(JwtAuthGuard)
  async invoke(
    @Param('slug') slug: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const jobId = await this.a2aRunner.runTask(
      { slug, ...body, userId },
      tenantId,
    );
    return { jobId };
  }

  @Get(':slug/status/:jobId')
  async status(@Param('jobId') jobId: string) {
    const status = await this.a2aRunner.getStatus(jobId);
    return { status };
  }

  @Get(':slug/result/:jobId')
  async result(@Param('jobId') jobId: string) {
    return this.a2aRunner.getResult(jobId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: any, @Body() dto: CreateListingDto) {
    return this.listingService.create(dto, req.user.tenantId, req.user.userId);
  }

  @Post(':id/versions')
  @UseGuards(JwtAuthGuard)
  publishVersion(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishVersionDto,
  ) {
    return this.listingService.publishVersion(id, dto, req.user.tenantId);
  }

  @Post(':id/install')
  @UseGuards(JwtAuthGuard)
  install(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InstallDto,
  ) {
    return this.listingService.install(
      id,
      dto,
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Post(':id/reviews')
  @UseGuards(JwtAuthGuard)
  createReview(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.listingService.createReview(
      id,
      dto,
      req.user.tenantId,
      req.user.userId,
    );
  }
}
