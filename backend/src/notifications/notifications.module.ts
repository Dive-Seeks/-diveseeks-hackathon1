import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { UserNotification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserNotification, NotificationPreference]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
