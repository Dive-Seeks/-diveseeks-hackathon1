import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: any, businessId?: string) {
    const category = this.categoryRepository.create({
      ...createCategoryDto,
      businessId: businessId || createCategoryDto.businessId,
    });
    const saved = await this.categoryRepository.save(category);
    return { success: true, data: saved };
  }

  async findAll(businessId?: string) {
    const where = businessId ? { businessId } : undefined;
    const categories = await this.categoryRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return { success: true, data: categories };
  }

  async findOne(id: string) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return { success: true, data: category };
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.categoryRepository.preload({
      id,
      ...updateCategoryDto,
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const saved = await this.categoryRepository.save(category);
    return { success: true, data: saved };
  }

  async remove(id: string) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    await this.categoryRepository.remove(category);
    return { success: true, message: `Category ${id} successfully deleted` };
  }
}
