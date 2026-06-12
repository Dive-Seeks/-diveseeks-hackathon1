import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreImagesController } from './store-images.controller';
import { StoreImagesService } from './store-images.service';
import { StoreImage } from './entities/store-image.entity';
import { FtpModule } from '../ftp/ftp.module';
import { Product } from '../products/entities/product.entity';
import { MenuItem } from '../menus/entities/menu-item.entity';
import { Store } from '../setup-business/entities/store.entity';
import { User } from '../users/entities/user.entity';
import { Site } from '../sites/entities/site.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StoreImage,
      Product,
      MenuItem,
      Store,
      User,
      Site,
    ]),
    FtpModule,
  ],
  controllers: [StoreImagesController],
  providers: [StoreImagesService],
  exports: [StoreImagesService],
})
export class StoreImagesModule {}
