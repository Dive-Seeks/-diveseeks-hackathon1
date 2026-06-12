import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { UpdateDriverLocationDto } from './dto/update-driver-location.dto';
import { DriverTrackingGateway } from './driver-tracking/driver-tracking.gateway';

@Injectable()
export class TrackingService implements OnModuleDestroy {
  private readonly logger = new Logger(TrackingService.name);
  private readonly channel = 'driver-location-updates';
  private readonly publisher: Redis | null;
  private readonly subscriber: Redis | null;

  constructor(
    private readonly cacheService: RedisCacheService,
    private readonly trackingGateway: DriverTrackingGateway,
    private readonly configService: ConfigService,
  ) {
    const host = this.configService.get<string>('REDIS_HOST');
    const port = this.configService.get<number>('REDIS_PORT');
    const password = this.configService.get<string>('REDIS_PASSWORD');

    if (!host || !port) {
      this.publisher = null;
      this.subscriber = null;
      this.logger.warn(
        'Redis pub/sub disabled because REDIS_HOST or REDIS_PORT is missing',
      );
      return;
    }

    const redisOpts = {
      host,
      port,
      password: password || undefined,
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: (times: number) =>
        times < 3 ? Math.min(times * 500, 2000) : null,
    };
    this.publisher = new Redis(redisOpts);
    this.subscriber = new Redis(redisOpts);
    void this.setupSubscriber();
  }

  async updateDriverLocation(dto: UpdateDriverLocationDto) {
    const payload = {
      tenantId: dto.tenantId,
      driverId: dto.driverId,
      orderId: dto.orderId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      timestamp: new Date().toISOString(),
    };

    const cacheKey = `tracking:driver:${dto.tenantId}:${dto.driverId}`;
    await this.cacheService.set(cacheKey, payload, 300);

    if (this.publisher) {
      await this.publisher.publish(this.channel, JSON.stringify(payload));
    } else {
      this.trackingGateway.emitDriverLocationUpdate(payload);
    }

    return payload;
  }

  async getLatestDriverLocation(tenantId: string, driverId: string) {
    const cacheKey = `tracking:driver:${tenantId}:${driverId}`;
    return this.cacheService.get<Record<string, unknown>>(cacheKey);
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.quit();
    }
    if (this.publisher) {
      await this.publisher.quit();
    }
  }

  private async setupSubscriber() {
    if (!this.subscriber) {
      return;
    }

    try {
      await this.publisher!.connect();
      await this.subscriber.connect();
    } catch {
      this.logger.warn(
        'Redis pub/sub unavailable, real-time tracking will use WebSockets directly',
      );
      return;
    }

    await this.subscriber.subscribe(this.channel);
    this.subscriber.on('message', (channel, message) => {
      if (channel !== this.channel) {
        return;
      }
      try {
        const payload = JSON.parse(message) as {
          tenantId: string;
          driverId: string;
          orderId: string;
          latitude: number;
          longitude: number;
          timestamp: string;
        };
        this.trackingGateway.emitDriverLocationUpdate(payload);
      } catch (error) {
        this.logger.error(
          `Failed to parse driver location message: ${(error as Error).message}`,
        );
      }
    });
  }
}
