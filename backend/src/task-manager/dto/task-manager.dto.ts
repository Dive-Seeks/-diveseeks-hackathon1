import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsUUID,
  IsInt,
  IsObject,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskKind, RetryPolicy } from '../entities/task.entity';
import { DependencyType } from '../entities/task-dependency.entity';

export class RetryPolicyDto implements RetryPolicy {
  @IsInt()
  @Min(1)
  @Max(10)
  maxAttempts: number;

  @IsInt()
  @Min(0)
  backoffMs: number;

  @IsInt()
  @Min(1)
  backoffMultiplier: number;

  @IsInt()
  @Min(1000)
  maxBackoffMs: number;
}

export class CreateTaskDto {
  @IsString()
  subject: string;

  @IsEnum(TaskKind)
  @IsOptional()
  kind?: TaskKind;

  @IsObject()
  @IsOptional()
  payload?: Record<string, any>;

  @ValidateNested()
  @Type(() => RetryPolicyDto)
  @IsOptional()
  retryPolicy?: RetryPolicyDto;

  @IsInt()
  @IsOptional()
  timeoutMs?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  priority?: number;

  @IsUUID()
  @IsOptional()
  parentTaskId?: string;

  @IsUUID()
  @IsOptional()
  workflowExecutionId?: string;

  @IsUUID()
  @IsOptional()
  assignedSpecialist?: string;
}

export class AddDependencyDto {
  @IsUUID()
  dependsOnTaskId: string;

  @IsEnum(DependencyType)
  @IsOptional()
  dependencyType?: DependencyType;

  @IsString()
  @IsOptional()
  outputPath?: string;

  @IsString()
  @IsOptional()
  inputKey?: string;
}

export class CreateTaskTemplateDto {
  @IsString()
  slug: string;

  @IsEnum(TaskKind)
  @IsOptional()
  kind?: TaskKind;

  @IsObject()
  @IsOptional()
  defaultPayload?: Record<string, any>;

  @IsArray()
  @IsOptional()
  variableSchema?: Array<{ name: string; required: boolean; default?: any }>;

  @ValidateNested()
  @Type(() => RetryPolicyDto)
  @IsOptional()
  retryPolicy?: RetryPolicyDto;

  @IsInt()
  @IsOptional()
  defaultTimeoutMs?: number;
}
