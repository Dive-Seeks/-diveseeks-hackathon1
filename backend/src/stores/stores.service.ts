import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from '../setup-business/entities/store.entity';
import { SalesGateway } from '../gateways/sales/sales.gateway';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    private readonly salesGateway: SalesGateway,
  ) {}

  async findAll(userId: string) {
    const stores = await this.storeRepository.find({
      where: { business: { userId } },
      relations: ['storeAddress', 'operatingHours', 'holidays'],
    });

    return stores;
  }

  async findOne(id: string) {
    const store = await this.storeRepository.findOne({
      where: { id },
      relations: ['storeAddress', 'operatingHours', 'holidays'],
    });

    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }

    return {
      success: true,
      data: store,
    };
  }

  emitStoreUpdated(store: Store) {
    this.salesGateway.server?.emit('store_updated', store);
  }

  emitStoreCreated(store: Store) {
    this.salesGateway.server?.emit('store_created', store);
  }
}
