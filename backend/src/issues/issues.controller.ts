import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IssuesService } from './issues.service';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';

@ApiTags('Agent Issues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agent-issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  create(@Body() dto: CreateIssueDto) {
    return this.issuesService.create(dto);
  }

  @Get()
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Req() req: any,
    @Query('agentId') agentId?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.issuesService.findAll(
      req.user.tenantId,
      agentId,
      status,
      page,
      limit,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.issuesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateIssueDto) {
    return this.issuesService.update(id, dto);
  }

  @Post(':id/checkout')
  checkout(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('agentId', ParseUUIDPipe) agentId: string,
  ) {
    return this.issuesService.checkoutIssueForAgent(id, agentId);
  }

  @Post(':id/release')
  release(@Param('id', ParseUUIDPipe) id: string) {
    return this.issuesService.releaseIssue(id);
  }
}
