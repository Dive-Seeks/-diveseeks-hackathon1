import { IsString, IsIn, IsNumber, IsOptional } from 'class-validator';

export class SignalEventDto {
  @IsIn(['message_sent', 'tab_hidden', 'tab_visible', 'rapid_send'])
  type: 'message_sent' | 'tab_hidden' | 'tab_visible' | 'rapid_send';

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsNumber()
  timestamp: number;
}
