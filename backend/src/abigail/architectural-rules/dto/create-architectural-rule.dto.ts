import {
  IsString,
  IsArray,
  IsInt,
  IsBoolean,
  IsIn,
  Min,
  Max,
  Length,
  Matches,
} from 'class-validator';

export class CreateArchitecturalRuleDto {
  @IsString()
  @Matches(/^ARCH\d{3}$/, { message: 'ruleId must match pattern ARCH000' })
  ruleId: string;

  @IsIn(['microservices', 'redis', 'monorepo', 'simplicity'])
  domain: string;

  @IsArray()
  @IsString({ each: true })
  triggerKeywords: string[];

  @IsInt()
  @Min(0)
  @Max(3)
  minTier: number;

  @IsInt()
  @Min(0)
  @Max(3)
  maxTier: number;

  @IsString()
  @Length(5, 200)
  title: string;

  @IsString()
  @Length(10, 2000)
  explanation: string;

  @IsString()
  @Length(10, 2000)
  counterProposal: string;

  @IsBoolean()
  requiresVisionOverride: boolean;
}
