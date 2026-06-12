import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class UpdateSchemaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  schema: string;
}
