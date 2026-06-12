import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  IsEnum,
} from 'class-validator';
import {
  ContingencyProbability,
  ContingencyType,
} from '../contingent-liability.entity';

export class CreateContingentDto {
  @IsString() @IsNotEmpty() description: string;
  @IsOptional() @IsNumber() @IsPositive() estimatedAmount?: number;
  @IsEnum(ContingencyProbability) probability: ContingencyProbability;
  @IsEnum(ContingencyType) contingencyType: ContingencyType;
  @IsOptional() @IsString() disclosureNote?: string;
}
