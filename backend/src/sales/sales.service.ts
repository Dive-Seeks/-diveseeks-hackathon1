import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { Sale } from './entities/sale.entity';
import { SalesGateway } from '../gateways/sales/sales.gateway';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    private readonly salesGateway: SalesGateway,
  ) {}

  async create(createSaleDto: CreateSaleDto, tenantId: string) {
    const sale = this.saleRepository.create({
      ...createSaleDto,
      businessId: tenantId,
    });
    const savedSale = await this.saleRepository.save(sale);

    // Emit event for real-time sync
    this.salesGateway.server?.emit('sale_created', savedSale);

    return {
      success: true,
      data: savedSale,
    };
  }

  async findAll(tenantId: string, storeId?: string) {
    const where = storeId
      ? { businessId: tenantId, storeId }
      : { businessId: tenantId };
    const sales = await this.saleRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: sales,
    };
  }

  async findOne(tenantId: string, id: string) {
    const sale = await this.saleRepository.findOne({
      where: { id, businessId: tenantId },
    });
    if (!sale) {
      throw new NotFoundException(
        `Sale with ID ${id} not found for tenant ${tenantId}`,
      );
    }

    return {
      success: true,
      data: sale,
    };
  }

  async update(tenantId: string, id: string, updateSaleDto: UpdateSaleDto) {
    const sale = await this.findOne(tenantId, id);
    await this.saleRepository.update(sale.data.id, updateSaleDto);
    const updatedSale = await this.findOne(tenantId, id);

    // Emit event for real-time sync
    this.salesGateway.server?.emit('sale_updated', updatedSale.data);

    return {
      success: true,
      data: updatedSale.data,
    };
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.saleRepository.delete({ id, businessId: tenantId });
    return {
      success: true,
      message: `Sale with ID ${id} removed`,
    };
  }
}
