import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Site } from './entities/site.entity';
import { SiteMenu } from '../menus/entities/site-menu.entity';
import { MenuCategory } from '../menus/entities/menu-category.entity';
import { MenuItem } from '../menus/entities/menu-item.entity';

@Injectable()
export class SitesService {
  constructor(
    @InjectRepository(Site)
    private readonly siteRepository: Repository<Site>,
    @InjectRepository(SiteMenu)
    private readonly siteMenuRepository: Repository<SiteMenu>,
    @InjectRepository(MenuCategory)
    private readonly menuCategoryRepository: Repository<MenuCategory>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
  ) {}

  async findAllByBusinessId(businessId: string): Promise<any[]> {
    const sites = await this.siteRepository.find({
      where: { businessId },
      order: { createdAt: 'ASC' },
    });

    // Get counts for each site
    const sitesWithCounts = await Promise.all(
      sites.map(async (site) => {
        const siteMenu = await this.siteMenuRepository.findOne({
          where: { siteId: site.id, isActive: true },
          relations: ['menu'],
        });

        let categoryCount = 0;
        let itemCount = 0;
        let modifierCount = 0;

        if (siteMenu && siteMenu.menu) {
          categoryCount = await this.menuCategoryRepository.count({
            where: { menuId: siteMenu.menu.id },
          });

          itemCount = await this.menuItemRepository.count({
            where: { menuId: siteMenu.menu.id },
          });

          // Modifiers are typically tracked separately - for now set to 0
          modifierCount = 0;
        }

        return {
          ...site,
          categoryCount,
          itemCount,
          modifierCount,
          region: 'Local',
          activeMenuId: siteMenu?.menu?.id || null,
          activeMenuName: siteMenu?.menu?.name || null,
        };
      }),
    );

    return sitesWithCounts;
  }

  async findOne(id: string): Promise<Site> {
    const site = await this.siteRepository.findOne({ where: { id } });
    if (!site) {
      throw new NotFoundException(`Site with ID ${id} not found`);
    }
    return site;
  }
}
