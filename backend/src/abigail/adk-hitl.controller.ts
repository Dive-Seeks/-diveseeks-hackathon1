import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdkOrchestrator } from './workflow-queue/adk-orchestrator.service';

export class AdkResumeDto {
  @IsUUID()
  runId!: string;

  @IsUUID()
  sessionId!: string;

  @IsBoolean()
  approved!: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

@Controller('adk-hitl')
export class AdkHitlController {
  constructor(private readonly orchestrator: AdkOrchestrator) {}

  @Post('resume')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async resume(@Body() dto: AdkResumeDto): Promise<{ success: boolean }> {
    await this.orchestrator.resumeRun(dto);
    return { success: true };
  }
}
