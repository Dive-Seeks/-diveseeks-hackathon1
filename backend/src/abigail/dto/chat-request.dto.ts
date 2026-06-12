import { IsString, IsOptional, IsIn, IsArray, IsObject } from 'class-validator';

export class ChatRequestDto {
  @IsOptional()
  @IsString()
  message?: string;

  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsIn(['coding', 'general', 'research'])
  team?: 'coding' | 'general' | 'research';

  @IsOptional()
  @IsString()
  specialist?: string;

  @IsOptional()
  @IsArray()
  contextFilter?: string[];

  @IsOptional()
  @IsIn(['fast', 'balanced', 'deep'])
  modelTier?: 'fast' | 'balanced' | 'deep';

  @IsOptional()
  @IsObject()
  docContext?: {
    docId: string;
    contentSnippet: string;
  };
}
