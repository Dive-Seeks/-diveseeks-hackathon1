import { IsString, IsArray, IsOptional, IsBoolean } from 'class-validator';

export class CreateRuleDto {
  @IsString() domain: string;
  @IsString() ruleKey: string;
  @IsArray() columns: string[];
  @IsArray() rows: Record<string, string>[];
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() description?: string;
}

export class UpdateRuleDto {
  @IsOptional() @IsArray() rows?: Record<string, string>[];
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() description?: string;
}
