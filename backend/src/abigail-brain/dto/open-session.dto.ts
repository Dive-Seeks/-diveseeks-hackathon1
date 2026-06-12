import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsEnum,
  IsOptional,
  IsIn,
} from 'class-validator';
import { BrainIntentType } from '../entities/brain-session.entity';

export class OpenSessionDto {
  @IsString()
  @IsNotEmpty()
  topic: string;

  @IsString()
  @IsIn(['feature', 'architecture', 'design', 'new_module'])
  intentType: BrainIntentType;

  @IsOptional()
  @IsUUID()
  tenantId?: string;
}
