import { IsIn, IsInt, Min, Max } from 'class-validator';

export class DeclareProjectTierDto {
  @IsInt()
  @Min(1)
  @Max(10000)
  teamSize: number;

  @IsIn(['greenfield', 'existing', 'migration'])
  projectType: 'greenfield' | 'existing' | 'migration';

  @IsIn(['prototype', 'long-term'])
  lifetime: 'prototype' | 'long-term';
}
