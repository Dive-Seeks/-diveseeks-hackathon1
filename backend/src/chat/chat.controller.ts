import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { UserChatService } from './user-chat.service';
import { IsString, IsEnum, IsOptional } from 'class-validator';

export class PostMessageDto {
  @IsString() content: string;
  @IsEnum(['user', 'agent']) senderType: 'user' | 'agent';
  @IsOptional() @IsString() agentName?: string;
}

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly userChatService: UserChatService,
  ) {}

  @Get('user/:projectId')
  async getUserHistory(
    @Param('projectId') projectId: string,
    @Query('limit') limit = 50,
    @Req() req: any,
  ) {
    return this.userChatService.getHistory(
      projectId,
      req.user.tenantId,
      +limit,
    );
  }

  @Get(':domain')
  async history(
    @Param('domain') domain: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Req() req: any,
  ) {
    if (domain === 'message') {
      return { data: [], total: 0 };
    }
    return this.chatService.getHistory(
      req.user.tenantId,
      domain,
      +page,
      +limit,
    );
  }

  @Post(':domain/message')
  async post(
    @Param('domain') domain: string,
    @Body() dto: PostMessageDto,
    @Req() req: any,
  ) {
    return this.chatService.saveMessage(req.user.tenantId, domain, dto);
  }

  @Get()
  async allDomains(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Req() req: any,
  ) {
    return this.chatService.getAllMessages(req.user.tenantId, +page, +limit);
  }
}
