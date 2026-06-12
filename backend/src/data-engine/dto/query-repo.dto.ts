import { IsString, IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryRepoDto {
  @IsUUID()
  repo_id: string;

  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  top_k?: number;
}
