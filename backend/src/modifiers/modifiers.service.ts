import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Modifier } from './entities/modifier.entity';
import { ModifierOption } from './entities/modifier-option.entity';
import { ModifierOptionPricing } from './entities/modifier-option-pricing.entity';
import { MenuItemModifier } from './entities/menu-item-modifier.entity';
import { CreateModifierDto } from './dto/create-modifier.dto';
import { UpdateModifierDto } from './dto/update-modifier.dto';
import { BulkUpdateStorePricingDto } from './dto/store-pricing.dto';

@Injectable()
export class ModifiersService {
  constructor(
    @InjectRepository(Modifier)
    private readonly modifierRepository: Repository<Modifier>,
    @InjectRepository(ModifierOption)
    private readonly modifierOptionRepository: Repository<ModifierOption>,
    @InjectRepository(ModifierOptionPricing)
    private readonly modifierOptionPricingRepository: Repository<ModifierOptionPricing>,
    @InjectRepository(MenuItemModifier)
    private readonly menuItemModifierRepository: Repository<MenuItemModifier>,
  ) {}

  async create(createModifierDto: CreateModifierDto, businessId?: string) {
    const modifier = this.modifierRepository.create({
      ...createModifierDto,
      businessId: businessId || createModifierDto.businessId,
    });

    const saved = await this.modifierRepository.save(modifier);
    // this.salesGateway.server?.emit('modifier_created', saved);
    return { success: true, data: saved };
  }

  async findAll(businessId?: string) {
    const where = businessId ? { businessId } : undefined;
    const modifiers = await this.modifierRepository.find({
      where,
      relations: ['options'],
      order: { displayOrder: 'ASC', createdAt: 'DESC' },
    });
    return { success: true, data: modifiers };
  }

  async findOne(id: string, includeStorePricing = false) {
    const modifier = await this.modifierRepository.findOne({
      where: { id },
      relations: ['options'],
    });

    if (!modifier) {
      throw new NotFoundException(`Modifier with ID ${id} not found`);
    }

    if (includeStorePricing && modifier.options) {
      // Load store-specific pricing for all options
      const optionIds = modifier.options.map((opt) => opt.id);
      const storePricing = await this.modifierOptionPricingRepository.find({
        where: optionIds.map((optId) => ({ modifierOptionId: optId })),
        relations: ['store'],
      });

      // Attach store pricing to each option
      modifier.options = modifier.options.map((option) => ({
        ...option,
        storePricing: storePricing.filter(
          (sp) => sp.modifierOptionId === option.id,
        ),
      }));
    }

    return { success: true, data: modifier };
  }

  async update(id: string, updateModifierDto: UpdateModifierDto) {
    const modifier = await this.modifierRepository.findOne({
      where: { id },
      relations: ['options'],
    });

    if (!modifier) {
      throw new NotFoundException(`Modifier with ID ${id} not found`);
    }

    // Update modifier properties
    Object.assign(modifier, updateModifierDto);

    // If options are provided, replace existing options
    if (updateModifierDto.options) {
      // Remove old options
      await this.modifierOptionRepository.delete({ modifierId: id });

      // Create new options
      modifier.options = updateModifierDto.options.map((optionDto) =>
        this.modifierOptionRepository.create({
          ...optionDto,
          modifierId: id,
        }),
      );
    }

    const saved = await this.modifierRepository.save(modifier);
    return { success: true, data: saved };
  }

  async remove(id: string) {
    const modifier = await this.modifierRepository.findOne({ where: { id } });
    if (!modifier) {
      throw new NotFoundException(`Modifier with ID ${id} not found`);
    }

    await this.modifierRepository.remove(modifier);
    return { success: true, message: `Modifier ${id} successfully deleted` };
  }

  /**
   * Update store-specific pricing for modifier options
   */
  async updateStorePricing(bulkUpdateDto: BulkUpdateStorePricingDto) {
    const results: any[] = [];

    for (const optionUpdate of bulkUpdateDto.options) {
      const option = await this.modifierOptionRepository.findOne({
        where: { id: optionUpdate.modifierOptionId },
      });

      if (!option) {
        throw new NotFoundException(
          `Modifier option ${optionUpdate.modifierOptionId} not found`,
        );
      }

      for (const storePrice of optionUpdate.storePrices) {
        // Upsert store pricing
        const existing = await this.modifierOptionPricingRepository.findOne({
          where: {
            modifierOptionId: optionUpdate.modifierOptionId,
            storeId: storePrice.storeId,
          },
        });

        if (existing) {
          existing.priceModifier = storePrice.priceModifier;
          await this.modifierOptionPricingRepository.save(existing);
          results.push({ ...existing, updated: true });
        } else {
          const newPricing = this.modifierOptionPricingRepository.create({
            modifierOptionId: optionUpdate.modifierOptionId,
            storeId: storePrice.storeId,
            priceModifier: storePrice.priceModifier,
          });
          const saved =
            await this.modifierOptionPricingRepository.save(newPricing);
          results.push({ ...saved, created: true });
        }
      }
    }

    return { success: true, data: results };
  }

  /**
   * Get modifier options with store-specific pricing
   */
  async getOptionStorePricing(modifierOptionId: string) {
    const option = await this.modifierOptionRepository.findOne({
      where: { id: modifierOptionId },
    });

    if (!option) {
      throw new NotFoundException(
        `Modifier option ${modifierOptionId} not found`,
      );
    }

    const storePricing = await this.modifierOptionPricingRepository.find({
      where: { modifierOptionId },
      relations: ['store'],
    });

    return {
      success: true,
      data: {
        option,
        storePricing,
      },
    };
  }

  /**
   * Link a modifier to a menu item
   */
  async linkToMenuItem(
    menuItemId: string,
    modifierId: string,
    displayOrder = 0,
  ) {
    const link = this.menuItemModifierRepository.create({
      menuItemId,
      modifierId,
      displayOrder,
    });

    const saved = await this.menuItemModifierRepository.save(link);
    return { success: true, data: saved };
  }

  /**
   * Unlink a modifier from a menu item
   */
  async unlinkFromMenuItem(menuItemId: string, modifierId: string) {
    const link = await this.menuItemModifierRepository.findOne({
      where: { menuItemId, modifierId },
    });

    if (!link) {
      throw new NotFoundException(
        `Link between menu item ${menuItemId} and modifier ${modifierId} not found`,
      );
    }

    await this.menuItemModifierRepository.remove(link);
    return { success: true, message: 'Modifier unlinked successfully' };
  }

  /**
   * Get all modifiers for a specific menu item
   */
  async getModifiersForMenuItem(menuItemId: string) {
    const links = await this.menuItemModifierRepository.find({
      where: { menuItemId },
      relations: ['modifier', 'modifier.options'],
      order: { displayOrder: 'ASC' },
    });

    const modifiers = links.map((link) => link.modifier);
    return { success: true, data: modifiers };
  }
}
