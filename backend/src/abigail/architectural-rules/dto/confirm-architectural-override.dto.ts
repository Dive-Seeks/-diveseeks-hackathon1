import { IsString, Length, Matches } from 'class-validator';

export class ConfirmArchitecturalOverrideDto {
  @IsString()
  @Matches(/^ARCH\d{3}$/, { message: 'ruleId must match pattern ARCH000' })
  ruleId: string;

  @IsString()
  @Length(10, 1000)
  reason: string;
}
