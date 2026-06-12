import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
  Post,
} from '@nestjs/common';
import { Request } from 'express';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    tenantId?: string;
    storeId?: string;
    role?: string;
  };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  create(
    @Req() req: RequestWithUser,
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(
      req.user.userId,
      createNotificationDto,
    );
  }

  @Get()
  findAll(
    @Req() req: RequestWithUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('unreadOnly', new DefaultValuePipe(false), ParseBoolPipe)
    unreadOnly: boolean,
  ) {
    return this.notificationsService.findAll(
      req.user.userId,
      page,
      limit,
      unreadOnly,
    );
  }

  @Patch(':id/read')
  markAsRead(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.notificationsService.markAsRead(req.user.userId, id);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: RequestWithUser) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  @Get('preferences')
  getPreferences(@Req() req: RequestWithUser) {
    return this.notificationsService.getPreferences(req.user.userId);
  }

  @Patch('preferences')
  updatePreferences(
    @Req() req: RequestWithUser,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationsService.updatePreferences(
      req.user.userId,
      updateNotificationDto,
    );
  }
}
