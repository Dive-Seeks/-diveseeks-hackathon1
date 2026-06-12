import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { SalesGateway } from '../gateways/sales/sales.gateway';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly salesGateway: SalesGateway,
  ) {}

  async create(createProductDto: any, businessId: string) {
    const product = this.productRepository.create({
      ...createProductDto,
      businessId,
    });
    const savedProduct = await this.productRepository.save(product);

    // Emit event for real-time sync
    this.salesGateway.server?.emit('product_created', savedProduct);

    return {
      success: true,
      data: savedProduct,
    };
  }

  async findAll(businessId: string, category?: string) {
    const where: any = { businessId };
    if (category && category !== 'All') where.category = category;

    const products = await this.productRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    return {
      success: true,
      data: products,
    };
  }

  async findOne(businessId: string, id: string) {
    const product = await this.productRepository.findOne({
      where: { id, businessId },
    });
    if (!product) {
      throw new NotFoundException(
        `Product with ID ${id} not found for business ${businessId}`,
      );
    }

    return {
      success: true,
      data: product,
    };
  }

  async update(
    businessId: string,
    id: string,
    updateProductDto: UpdateProductDto,
  ) {
    const product = await this.findOne(businessId, id);
    await this.productRepository.update(product.data.id, updateProductDto);
    const updatedProduct = await this.findOne(businessId, id);

    // Emit event for real-time sync
    this.salesGateway.server?.emit('product_updated', updatedProduct.data);

    return {
      success: true,
      data: updatedProduct.data,
    };
  }

  async remove(businessId: string, id: string) {
    await this.findOne(businessId, id);
    await this.productRepository.delete({ id, businessId });

    // Emit event for real-time sync
    this.salesGateway.server?.emit('product_deleted', { id });

    return {
      success: true,
      message: `Product with ID ${id} deleted`,
    };
  }
}
