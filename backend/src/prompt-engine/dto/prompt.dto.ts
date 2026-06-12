import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
  IsUUID,
  IsObject,
} from 'class-validator';
import { PromptKind, PromptReleaseLabel } from '../entities/prompt.entity';
import { VariableSchema } from '../entities/prompt-version.entity';

export class CreatePromptDto {
  @IsString()
  @MaxLength(120)
  slug: string;

  @IsEnum(PromptKind)
  kind: PromptKind;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  body: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  roleTarget?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  domain?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PromptReleaseLabel)
  @IsOptional()
  releaseLabel?: PromptReleaseLabel;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsArray()
  @IsOptional()
  variableSchema?: VariableSchema[];

  @IsArray()
  @IsOptional()
  partialRefs?: string[];
}

export class UpdatePromptDto {
  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PromptReleaseLabel)
  @IsOptional()
  releaseLabel?: PromptReleaseLabel;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  archived?: boolean;
}

export class CreatePromptVersionDto {
  @IsString()
  body: string;

  @IsArray()
  @IsOptional()
  variableSchema?: VariableSchema[];

  @IsArray()
  @IsOptional()
  partialRefs?: string[];

  @IsString()
  @IsOptional()
  changeNote?: string;
}

export class CompilePromptDto {
  @IsObject()
  variables: Record<string, unknown>;
}

export class QueryPromptsDto {
  @IsEnum(PromptKind)
  @IsOptional()
  kind?: PromptKind;

  @IsString()
  @IsOptional()
  roleTarget?: string;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsString()
  @IsOptional()
  tag?: string;

  @IsBoolean()
  @IsOptional()
  archived?: boolean;
}

export class CreatePartialDto {
  @IsString()
  @MaxLength(120)
  slug: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  body: string;
}

export class UpdatePartialDto {
  @IsString()
  @MaxLength(200)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  body?: string;
}
