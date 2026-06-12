import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Business,
  BusinessStatus,
} from '../setup-business/entities/business.entity';
import { UpdateIncompleteStoreDto } from './dto/update-incomplete-store.dto';
import { RedisCacheService } from '../common/cache/redis-cache.service';

@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  constructor(
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    private readonly cacheService: RedisCacheService,
  ) {}

  private async findUserIncompleteBusinessOrThrow(userId: string, id: string) {
    const business = await this.businessRepository.findOne({
      where: {
        id,
        userId,
      },
      relations: ['registeredAddress'],
    });

    if (!business) {
      throw new NotFoundException('Incomplete store record not found');
    }

    if (
      business.status !== BusinessStatus.UNSAVED &&
      business.status !== BusinessStatus.SAVED
    ) {
      throw new NotFoundException('Incomplete store record not found');
    }

    return business;
  }

  async getIncompleteRecord(userId: string, id: string) {
    return this.findUserIncompleteBusinessOrThrow(userId, id);
  }

  async updateIncompleteRecord(
    userId: string,
    id: string,
    updateDto: UpdateIncompleteStoreDto,
  ) {
    const business = await this.findUserIncompleteBusinessOrThrow(userId, id);

    if (Object.keys(updateDto).length === 0) {
      throw new BadRequestException('No fields provided for update');
    }

    const updatedBusiness = this.businessRepository.merge(business, updateDto);
    const saved = await this.businessRepository.save(updatedBusiness);
    await this.cacheService.delByPrefix(`store:list:${userId}:`);
    this.logger.log(`Updated incomplete store ${id} for user ${userId}`);
    return saved;
  }

  async deleteIncompleteRecord(userId: string, id: string) {
    const business = await this.findUserIncompleteBusinessOrThrow(userId, id);
    await this.businessRepository.remove(business);
    await this.cacheService.delByPrefix(`store:list:${userId}:`);
    this.logger.log(`Deleted incomplete store ${id} for user ${userId}`);
    return {
      success: true,
      message: 'Incomplete store record deleted successfully',
      id,
    };
  }
}
