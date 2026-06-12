import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CaInventoryValuation,
  InventoryMethod,
} from './inventory-valuation.entity';

export class CreateInventoryValuationDto {
  productId: string;
  method: InventoryMethod;
  unitCost: number;
  quantityOnHand: number;
  valuationDate: string;
}

@Injectable()
export class InventoryValuationService {
  constructor(
    @InjectRepository(CaInventoryValuation)
    private readonly repo: Repository<CaInventoryValuation>,
  ) {}

  async create(
    tenantId: string,
    dto: CreateInventoryValuationDto,
  ): Promise<CaInventoryValuation> {
    // Consistency principle: method cannot change once elected for a product
    const existing = await this.repo.findOne({
      where: { tenantId, productId: dto.productId, isDeleted: false },
      order: { createdAt: 'ASC' },
    });

    if (existing && existing.method !== dto.method) {
      throw new ConflictException(
        `Inventory method already elected as ${existing.method} for this product. ` +
          `Consistency principle: method cannot change once elected.`,
      );
    }

    const totalValue = Number((dto.unitCost * dto.quantityOnHand).toFixed(2));
    const valuation = this.repo.create({
      tenantId,
      productId: dto.productId,
      method: dto.method,
      unitCost: dto.unitCost,
      quantityOnHand: dto.quantityOnHand,
      totalValue,
      valuationDate: new Date(dto.valuationDate),
    });
    return this.repo.save(valuation);
  }

  async findAll(tenantId: string): Promise<CaInventoryValuation[]> {
    return this.repo.find({
      where: { tenantId, isDeleted: false },
      order: { valuationDate: 'DESC' },
    });
  }

  async findByProduct(
    tenantId: string,
    productId: string,
  ): Promise<CaInventoryValuation[]> {
    return this.repo.find({
      where: { tenantId, productId, isDeleted: false },
      order: { valuationDate: 'DESC' },
    });
  }

  async getLatest(
    tenantId: string,
    productId: string,
  ): Promise<CaInventoryValuation | null> {
    return this.repo.findOne({
      where: { tenantId, productId, isDeleted: false },
      order: { valuationDate: 'DESC' },
    });
  }

  // Weighted average recalculation after a new purchase
  async updateWeightedAverage(
    tenantId: string,
    productId: string,
    newUnits: number,
    newUnitCost: number,
    valuationDate: string,
  ): Promise<CaInventoryValuation> {
    const latest = await this.getLatest(tenantId, productId);
    if (!latest) {
      return this.create(tenantId, {
        productId,
        method: InventoryMethod.WEIGHTED_AVERAGE,
        unitCost: newUnitCost,
        quantityOnHand: newUnits,
        valuationDate,
      });
    }

    const totalUnits = latest.quantityOnHand + newUnits;
    const totalCost = latest.totalValue + newUnits * newUnitCost;
    const newAvgCost = Number((totalCost / totalUnits).toFixed(4));

    return this.create(tenantId, {
      productId,
      method: InventoryMethod.WEIGHTED_AVERAGE,
      unitCost: newAvgCost,
      quantityOnHand: totalUnits,
      valuationDate,
    });
  }
}
