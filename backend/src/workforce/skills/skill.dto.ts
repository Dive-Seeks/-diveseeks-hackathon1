import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateSkillDto {
  @IsString() skillName: string;
  @IsOptional() @IsString() domain?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) targetRoles?: string[];
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateSkillDto {
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) targetRoles?: string[];
}

export class SkillManifest {
  name: string;
  domain: string | null;
  description: string;
  targetRoles: string[];
  body: string; // full markdown content after frontmatter
  filePath: string;
}
