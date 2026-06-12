import { IsUUID } from 'class-validator';

export class CanvasStopDto {
  @IsUUID()
  projectId: string;
}
