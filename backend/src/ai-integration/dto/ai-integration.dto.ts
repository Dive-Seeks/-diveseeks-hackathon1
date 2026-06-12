import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AiProvider, AiContext } from '../entities/ai-configuration.entity';

const PROVIDERS = ['openai', 'groq', 'openrouter', 'google', 'deepseek'] as const;

export class SaveAiConfigDto {
  @ApiProperty({
    example: 'pos',
    enum: ['pos', 'coding'],
    description:
      'Product context — pos (POS dashboard) or coding (AI framework)',
    required: false,
  })
  @IsString()
  @IsOptional()
  @IsIn(['pos', 'coding'])
  context?: AiContext;

  @ApiProperty({
    example: 'openai',
    enum: PROVIDERS,
    description: 'The active AI provider to use',
  })
  @IsString()
  @IsIn(PROVIDERS)
  provider: AiProvider;

  @ApiProperty({
    example: 'gpt-4o',
    description: 'Default model for the selected provider',
  })
  @IsString()
  @IsNotEmpty()
  model: string;

  @ApiProperty({ example: 'sk-proj-...', required: false })
  @IsString()
  @IsOptional()
  openaiApiKey?: string;

  @ApiProperty({ example: 'gsk_...', required: false })
  @IsString()
  @IsOptional()
  groqApiKey?: string;

  @ApiProperty({ example: 'sk-or-...', required: false })
  @IsString()
  @IsOptional()
  openRouterApiKey?: string;

  @ApiProperty({ example: 'AIza... or any valid Gemini key', required: false })
  @IsString()
  @IsOptional()
  googleApiKey?: string;

  @ApiProperty({ example: 'sk-...', required: false })
  @IsString()
  @IsOptional()
  deepseekApiKey?: string;
}

export class TestApiKeyDto {
  @ApiProperty({ enum: PROVIDERS })
  @IsString()
  @IsIn(PROVIDERS)
  provider: AiProvider;

  @ApiProperty({ example: 'your-api-key' })
  @IsString()
  @IsNotEmpty()
  apiKey: string;
}
