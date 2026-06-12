import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsEnum } from 'class-validator';
import { CreateIssueDto } from './create-issue.dto';

export class UpdateIssueDto extends PartialType(CreateIssueDto) {
  @IsOptional()
  @IsEnum([
    'todo',
    'assigned',
    'in_progress',
    'in_review',
    'waiting_approval',
    'done',
    'rejected',
    'cancelled',
  ])
  status?: string;

  @IsOptional()
  workProducts?: Record<string, any>[];
}
