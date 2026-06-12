import { IsUUID, IsIn, IsOptional, IsString } from 'class-validator';

export class ResolveContradictionDto {
  @IsUUID()
  extraction_id: string;

  @IsIn(['keep_new', 'keep_old', 'both'])
  resolution: 'keep_new' | 'keep_old' | 'both';

  @IsOptional()
  @IsString()
  note?: string;
}
