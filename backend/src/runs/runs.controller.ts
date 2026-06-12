import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RunsService } from './runs.service';
import { CreateRunDto } from './dto/create-run.dto';

@ApiTags('Heartbeat Runs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agent-runs')
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Post()
  create(@Body() dto: CreateRunDto) {
    return this.runsService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.runsService.findOne(id);
  }

  @Get('issue/:issueId')
  findByIssue(@Param('issueId', ParseUUIDPipe) issueId: string) {
    return this.runsService.findByIssue(issueId);
  }

  @Get('agent/:agentId')
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findByAgent(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.runsService.findByAgent(agentId, page, limit);
  }

  @Post(':id/complete')
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    result: {
      status: string;
      inputTokens?: number;
      outputTokens?: number;
      costUsd?: number;
      error?: string;
      excerptOutput?: string;
    },
  ) {
    return this.runsService.complete(id, result);
  }
}
