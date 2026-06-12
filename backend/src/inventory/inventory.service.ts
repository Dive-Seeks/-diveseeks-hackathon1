import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { Inventory } from './entities/inventory.entity';
import { SalesGateway } from '../gateways/sales/sales.gateway';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    private readonly salesGateway: SalesGateway,
  ) {}

  async create(createInventoryDto: any, tenantId: string) {
    const inventory = this.inventoryRepository.create({
      ...createInventoryDto,
      businessId: tenantId,
    });
    const savedInventory = (await this.inventoryRepository.save(
      inventory,
    )) as unknown as Inventory;

    // Emit event for real-time sync
    this.salesGateway.server?.emit('inventory_updated', {
      tenantId: savedInventory.businessId,
      storeId: savedInventory.storeId,
      productId: savedInventory.productId,
      quantity: savedInventory.quantity,
    });

    return {
      success: true,
      data: savedInventory,
    };
  }

  async findAll(tenantId: string, storeId?: string) {
    const where = storeId
      ? { businessId: tenantId, storeId }
      : { businessId: tenantId };
    const inventory = await this.inventoryRepository.find({
      where,
      relations: ['product'],
    });

    return {
      success: true,
      data: inventory,
    };
  }

  async findOne(tenantId: string, id: string) {
    const inventory = await this.inventoryRepository.findOne({
      where: { id, businessId: tenantId },
      relations: ['product'],
    });
    if (!inventory) {
      throw new NotFoundException(
        `Inventory with ID ${id} not found for tenant ${tenantId}`,
      );
    }

    return {
      success: true,
      data: inventory,
    };
  }

  async update(
    tenantId: string,
    id: string,
    updateInventoryDto: UpdateInventoryDto,
  ) {
    const inventory = await this.findOne(tenantId, id);
    await this.inventoryRepository.update(
      inventory.data.id,
      updateInventoryDto,
    );
    const updatedInventory = await this.findOne(tenantId, id);

    // Emit event for real-time sync
    this.salesGateway.server?.emit('inventory_updated', {
      storeId: updatedInventory.data.storeId,
      productId: updatedInventory.data.productId,
      quantity: updatedInventory.data.quantity,
    });

    return {
      success: true,
      data: updatedInventory.data,
    };
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.inventoryRepository.delete({ id, businessId: tenantId });
    return {
      success: true,
      message: `Inventory with ID ${id} removed`,
    };
  }
}
