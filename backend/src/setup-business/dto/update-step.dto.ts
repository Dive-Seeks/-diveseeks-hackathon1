import { IsInt, Min, Max, IsNotEmpty, IsObject } from 'class-validator';

export class UpdateStepDto {
  @IsInt()
  @Min(1)
  @Max(4)
  step: number;

  @IsNotEmpty()
  @IsObject()
  data: any;
}
