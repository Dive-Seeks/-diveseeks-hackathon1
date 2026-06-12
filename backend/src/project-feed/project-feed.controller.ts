import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProjectFeedService } from './project-feed.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenantId as TenantId } from '../common/cls/current-tenant-id.decorator';
import { TenantClsService } from '../common/cls/tenant-cls.service';
import { AbigailMindService } from '../abigail/abigail-mind.service';

@Controller('project-feed')
@UseGuards(JwtAuthGuard)
export class ProjectFeedController {
  constructor(
    private readonly projectFeedService: ProjectFeedService,
    private readonly tenantCls: TenantClsService,
    private readonly abigailMind: AbigailMindService,
  ) {}

  @Get(':projectId')
  async getFeed(
    @Param('projectId') projectId: string,
    @TenantId() tenantId: string,
  ) {
    const resolvedTenantId =
      tenantId ??
      this.tenantCls.getTenantId() ??
      this.tenantCls.getUserId() ??
      '';
    return this.projectFeedService.getFeed(resolvedTenantId, projectId);
  }

  @Get(':projectId/chat')
  async getChat(
    @Param('projectId') projectId: string,
    @TenantId() tenantId: string,
    @Query('threadId') threadId?: string,
  ) {
    const resolvedTenantId =
      tenantId ??
      this.tenantCls.getTenantId() ??
      this.tenantCls.getUserId() ??
      '';
    return this.projectFeedService.getChatThread(
      resolvedTenantId,
      projectId,
      threadId,
    );
  }

  @Post(':projectId/suggest')
  async suggest(
    @Param('projectId') projectId: string,
    @Body() dto: { suggestion: string },
  ) {
    const tenantId = this.tenantCls.getTenantId() ?? '';
    const userId = this.tenantCls.getUserId() ?? '';

    // Write a system feed message immediately so the user sees their suggestion acknowledged.
    await this.projectFeedService.addMessage({
      tenantId,
      projectId,
      type: 'vision_ready',
      content: `User suggestion received: "${dto.suggestion.slice(0, 120)}"`,
    });

    // Fire-and-forget — CEO decides what tasks to create.
    this.abigailMind
      .processSuggestion({
        projectId,
        tenantId,
        userId,
        suggestion: dto.suggestion,
      })
      .catch(() => {});

    return { queued: true };
  }
}
