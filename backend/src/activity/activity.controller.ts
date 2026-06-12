import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivityService } from './activity.service';

@ApiTags('Activity Log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('tenant/:tenantId')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findByTenant(
    @Param('tenantId', ParseUUIDPipe) tenantId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.activityService.findByTenant(tenantId, page, limit);
  }

  @Get('agent/:agentId')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findByAgent(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.activityService.findByAgent(agentId, page, limit);
  }

  @Get('issue/:issueId')
  findByIssue(@Param('issueId', ParseUUIDPipe) issueId: string) {
    return this.activityService.findByIssue(issueId);
  }
}
