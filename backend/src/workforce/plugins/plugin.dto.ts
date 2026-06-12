import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreatePluginDto {
  @IsString() pluginName: string;
  @IsOptional() @IsArray() @IsString({ each: true }) domains?: string[];
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() config?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdatePluginDto {
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() config?: string;
  @IsOptional() @IsString() notes?: string;
}

export class PluginTool {
  name: string;
  description: string;
  parameters: Record<string, string>;
}

export class PluginHookDeclaration {
  point: string;
  priority: number;
}

export class PluginManifest {
  name: string;
  description: string;
  version: string;
  domains: string[];
  executionMode: 'trusted' | 'sandbox';
  hooks: PluginHookDeclaration[];
  permissions: string[];
  tools: PluginTool[];
  filePath: string;
}
