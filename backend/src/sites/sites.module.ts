import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SitesService } from './sites.service';
import { SitesController } from './sites.controller';
import { Site } from './entities/site.entity';
import { SiteMenu } from '../menus/entities/site-menu.entity';
import { MenuCategory } from '../menus/entities/menu-category.entity';
import { MenuItem } from '../menus/entities/menu-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Site, SiteMenu, MenuCategory, MenuItem])],
  controllers: [SitesController],
  providers: [SitesService],
  exports: [SitesService],
})
export class SitesModule {}
