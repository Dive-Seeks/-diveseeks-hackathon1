import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { A2ARunnerService } from './a2a-runner.service';

@Controller('a2a')
export class A2ARunnerController {
  constructor(private readonly runner: A2ARunnerService) {}

  @Post('run')
  @UseGuards(JwtAuthGuard)
  async run(@Body() body: any, @Req() req: any) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;
    const jobId = await this.runner.runTask({ ...body, userId }, tenantId);
    return { jobId };
  }

  @Get(':jobId/status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Param('jobId') jobId: string) {
    const status = await this.runner.getStatus(jobId);
    return { status };
  }

  @Get(':jobId/result')
  @UseGuards(JwtAuthGuard)
  async getResult(@Param('jobId') jobId: string) {
    return this.runner.getResult(jobId);
  }
}
