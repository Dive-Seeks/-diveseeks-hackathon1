import { IsString, IsOptional, IsEnum } from 'class-validator';

export class ApprovalDecisionDto {
  @IsEnum(['approve', 'reject', 'revision_requested'])
  action: 'approve' | 'reject' | 'revision_requested';

  @IsOptional()
  @IsString()
  decisionNote?: string;
}
