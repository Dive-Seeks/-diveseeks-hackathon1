import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { UserNotification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(UserNotification)
    private readonly notificationRepository: Repository<UserNotification>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepository: Repository<NotificationPreference>,
  ) {}

  async create(userId: string, createNotificationDto: CreateNotificationDto) {
    const notification = this.notificationRepository.create({
      ...createNotificationDto,
      userId,
      tenantId: createNotificationDto.tenantId || null,
      type: createNotificationDto.type || 'system',
      channel: createNotificationDto.channel || 'in_app',
      actionUrl: createNotificationDto.actionUrl || null,
      isRead: false,
      readAt: null,
    });

    const saved = await this.notificationRepository.save(notification);
    return {
      success: true,
      data: saved,
    };
  }

  async findAll(
    userId: string,
    page: number,
    limit: number,
    unreadOnly: boolean,
  ) {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const where = unreadOnly ? { userId, isRead: false } : { userId };

    const [items, total] = await this.notificationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    return {
      success: true,
      data: items,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 1,
      },
    };
  }

  async markAsRead(userId: string, id: string) {
    await this.notificationRepository.update(
      { id, userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    return {
      success: true,
      data: notification,
    };
  }

  async markAllAsRead(userId: string) {
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    return {
      success: true,
      data: {
        updated: result.affected || 0,
      },
    };
  }

  async getPreferences(userId: string) {
    const preferences = await this.getOrCreatePreferences(userId);
    return {
      success: true,
      data: preferences,
    };
  }

  async updatePreferences(
    userId: string,
    updateNotificationDto: UpdateNotificationDto,
  ) {
    const preferences = await this.getOrCreatePreferences(userId);
    const nextPreferences = this.preferenceRepository.merge(
      preferences,
      updateNotificationDto,
    );
    const saved = await this.preferenceRepository.save(nextPreferences);

    return {
      success: true,
      data: saved,
    };
  }

  private async getOrCreatePreferences(userId: string) {
    let preferences = await this.preferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferenceRepository.create({
        userId,
        emailEnabled: true,
        pushEnabled: false,
        inAppEnabled: true,
        billingAlertsEnabled: true,
        securityAlertsEnabled: true,
        productUpdatesEnabled: true,
      });
      preferences = await this.preferenceRepository.save(preferences);
    }

    return preferences;
  }
}
