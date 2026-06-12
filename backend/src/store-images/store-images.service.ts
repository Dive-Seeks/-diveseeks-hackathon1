import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { StoreImage } from './entities/store-image.entity';
import { FtpService } from '../ftp/ftp.service';
import { GetStoreImagesDto } from './dto/get-store-images.dto';
import { AssignImageDto } from './dto/assign-image.dto';
import { Product } from '../products/entities/product.entity';
import { MenuItem } from '../menus/entities/menu-item.entity';
import { Store } from '../setup-business/entities/store.entity';
import { User } from '../users/entities/user.entity';
import { Site } from '../sites/entities/site.entity';
import * as path from 'path';
import * as fs from 'fs';
const sharp = require('sharp');

@Injectable()
export class StoreImagesService {
  private readonly logger = new Logger(StoreImagesService.name);
  private readonly uploadsPath = path.join(process.cwd(), 'uploads');

  constructor(
    @InjectRepository(StoreImage)
    private readonly storeImageRepository: Repository<StoreImage>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Site)
    private readonly siteRepository: Repository<Site>,
    private readonly ftpService: FtpService,
  ) {
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsPath)) {
      fs.mkdirSync(this.uploadsPath, { recursive: true });
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    tenantId: string,
    storeId: string,
    tags?: string[],
  ): Promise<StoreImage> {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.webp';
    const fileName = `${timestamp}${ext}`;
    const tempPath = path.join(this.uploadsPath, fileName);

    let resolvedTenantId = tenantId;
    let resolvedStoreId: string | null = null;
    let resolvedSiteId: string | null = null;

    // Resolve store and tenant information
    const store = await this.storeRepository.findOne({
      where: { id: storeId },
      relations: ['business', 'business.user'],
    });

    if (store) {
      resolvedStoreId = store.id;
    } else {
      // If not found as a store, it might be a site ID (frontend uses site IDs in gallery)
      this.logger.log(
        `ID ${storeId} not found in stores table, checking sites table...`,
      );
      const site = await this.siteRepository.findOne({
        where: { id: storeId },
        relations: ['business', 'business.user'],
      });

      if (site) {
        this.logger.log(`Resolved site ${site.name} from ID ${storeId}`);
        resolvedSiteId = site.id;
        resolvedStoreId = site.storeId;

        // If we still don't have a resolvedTenantId, get it from site's business owner
        if (!resolvedTenantId && site.business?.user) {
          resolvedTenantId =
            site.business.user.tenantId || site.business.userId;
          this.logger.log(
            `Resolved tenantId from site owner: ${resolvedTenantId}`,
          );
        }
      } else {
        this.logger.warn(`ID ${storeId} not found in sites table either!`);
        // Last fallback: use the provided ID as storeId
        resolvedStoreId = storeId;
      }
    }

    this.logger.log(
      `Final resolution for upload - tenantId: ${resolvedTenantId}, storeId: ${resolvedStoreId}, siteId: ${resolvedSiteId}`,
    );

    // Final checks and resolution for tenantId if still missing
    if (!resolvedTenantId && store) {
      if (store.business?.user?.tenantId) {
        resolvedTenantId = store.business.user.tenantId;
        this.logger.log(
          `Resolved tenantId from store owner: ${resolvedTenantId}`,
        );
      } else if (store.business?.userId) {
        resolvedTenantId = store.business.userId;
        this.logger.log(
          `Resolved tenantId from store userId fallback: ${resolvedTenantId}`,
        );
      }
    }

    if (!resolvedTenantId) {
      this.logger.error(`Failed to resolve tenantId for ID ${storeId}`);
      throw new BadRequestException(
        'Tenant ID could not be resolved for upload',
      );
    }

    try {
      // Process image with Sharp
      const imageBuffer = await sharp(file.buffer)
        .resize(1200, 1200, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Get metadata
      const metadata = await sharp(file.buffer).metadata();

      // Save processed image temporarily
      fs.writeFileSync(tempPath, imageBuffer);

      // Create thumbnail
      const thumbnailExt = '-thumb' + ext;
      const thumbnailFileName = `${timestamp}${thumbnailExt}`;
      const thumbnailPath = path.join(this.uploadsPath, thumbnailFileName);

      await sharp(file.buffer)
        .resize(300, 300, {
          fit: 'cover',
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      // Upload main image and thumbnail to FTP in a single session
      const ftpResults = await this.ftpService.uploadTenantFiles(
        [
          { localPath: tempPath, fileName },
          { localPath: thumbnailPath, fileName: thumbnailFileName },
        ],
        resolvedTenantId,
        resolvedStoreId || resolvedSiteId || 'global',
        'gallery',
      );

      const ftpResult = ftpResults[0];
      const thumbnailResult = ftpResults[1];

      // Create database record
      const storeImage = this.storeImageRepository.create({
        tenantId: resolvedTenantId,
        storeId: resolvedStoreId,
        siteId: resolvedSiteId,
        fileName,
        originalName: file.originalname,
        ftpPath: ftpResult.path,
        ftpUrl: ftpResult.url,
        thumbnailUrl: thumbnailResult.url,
        fileSize: imageBuffer.length,
        mimeType: 'image/jpeg',
        width: metadata.width,
        height: metadata.height,
        tags: tags || [],
        usageCount: 0,
        usedByProducts: [],
        usedByCategories: [],
      });

      const saved = await this.storeImageRepository.save(storeImage);

      // Cleanup temp files
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }

      return saved;
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      this.logger.error('Failed to upload image:', error);
      throw error;
    }
  }

  async findByStore(
    storeId: string,
    tenantId: string,
    query: GetStoreImagesDto,
  ) {
    const { page = 1, limit = 20, search, tags } = query;
    const skip = (page - 1) * limit;

    let resolvedStoreId: string | null = null;
    let resolvedSiteId: string | null = null;
    let resolvedTenantId = tenantId;

    // Check if storeId is actually a siteId
    const store = await this.storeRepository.findOne({
      where: { id: storeId },
    });
    if (store) {
      resolvedStoreId = store.id;
    } else {
      const site = await this.siteRepository.findOne({
        where: { id: storeId },
      });
      if (site) {
        resolvedSiteId = site.id;
        resolvedStoreId = site.storeId;
        if (!resolvedTenantId) {
          const business = await this.siteRepository.findOne({
            where: { id: site.id },
            relations: ['business', 'business.user'],
          });
          resolvedTenantId =
            (business as any)?.business?.user?.tenantId ||
            (business as any)?.business?.userId;
        }
      } else {
        resolvedStoreId = storeId;
      }
    }

    const queryBuilder = this.storeImageRepository.createQueryBuilder('image');

    if (resolvedSiteId) {
      // If we have a siteId, prioritize filtering by it for isolation
      queryBuilder.where('image.siteId = :siteId', { siteId: resolvedSiteId });
    } else if (resolvedStoreId) {
      // Otherwise filter by storeId
      queryBuilder.where('image.storeId = :storeId', {
        storeId: resolvedStoreId,
      });
    }

    if (resolvedTenantId) {
      queryBuilder.andWhere('image.tenantId = :tenantId', {
        tenantId: resolvedTenantId,
      });
    }

    if (search) {
      queryBuilder.andWhere(
        '(image.fileName ILIKE :search OR image.originalName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (tags) {
      // tags column is simple-array (TEXT), so use ILIKE matching
      const tagArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (tagArray.length > 0) {
        const tagConditions = tagArray.map(
          (_, i) => `image.tags ILIKE :tag${i}`,
        );
        const tagParams = Object.fromEntries(
          tagArray.map((t, i) => [`tag${i}`, `%${t}%`]),
        );
        queryBuilder.andWhere(`(${tagConditions.join(' OR ')})`, tagParams);
      }
    }

    const [images, total] = await queryBuilder
      .orderBy('image.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      images,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, tenantId: string): Promise<StoreImage> {
    const image = await this.storeImageRepository.findOne({
      where: { id, tenantId },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    // Update last accessed
    await this.storeImageRepository.update(id, {
      lastAccessedAt: new Date(),
    });

    return image;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const image = await this.findOne(id, tenantId);

    // Check if image is in use
    if (image.usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete image. It is used by ${image.usageCount} product(s) or category(ies)`,
      );
    }

    // Delete from FTP
    await this.ftpService.deleteTenantFile(
      tenantId,
      image.storeId || image.siteId || 'global',
      'gallery',
      image.fileName,
    );

    // Also delete thumbnail if it exists
    if (image.thumbnailUrl) {
      const thumbnailName = path.basename(image.thumbnailUrl);
      try {
        await this.ftpService.deleteTenantFile(
          tenantId,
          image.storeId || image.siteId || 'global',
          'gallery',
          thumbnailName,
        );
      } catch (e) {
        this.logger.warn(
          `Failed to delete thumbnail ${thumbnailName}: ${e.message}`,
        );
      }
    }

    // Delete from database
    await this.storeImageRepository.delete(id);
  }

  async incrementUsage(
    imageId: string,
    entityType: 'product' | 'category',
    entityId: string,
  ): Promise<void> {
    const image = await this.storeImageRepository.findOne({
      where: { id: imageId },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    const updateData: any = {
      usageCount: image.usageCount + 1,
    };

    if (entityType === 'product') {
      updateData.usedByProducts = [...image.usedByProducts, entityId];
    } else {
      updateData.usedByCategories = [...image.usedByCategories, entityId];
    }

    await this.storeImageRepository.update(imageId, updateData);
  }

  async decrementUsage(
    imageId: string,
    entityType: 'product' | 'category',
    entityId: string,
  ): Promise<void> {
    const image = await this.storeImageRepository.findOne({
      where: { id: imageId },
    });

    if (!image) {
      return; // Already deleted
    }

    const updateData: any = {
      usageCount: Math.max(0, image.usageCount - 1),
    };

    if (entityType === 'product') {
      updateData.usedByProducts = image.usedByProducts.filter(
        (id) => id !== entityId,
      );
    } else {
      updateData.usedByCategories = image.usedByCategories.filter(
        (id) => id !== entityId,
      );
    }

    await this.storeImageRepository.update(imageId, updateData);
  }

  async getCriticalImages(
    storeId: string,
    tenantId: string,
  ): Promise<StoreImage[]> {
    return await this.storeImageRepository.find({
      where: { storeId, tenantId },
      order: { usageCount: 'DESC', createdAt: 'DESC' },
      take: 50,
    });
  }

  async assignImage(
    imageId: string,
    tenantId: string,
    dto: AssignImageDto,
  ): Promise<StoreImage> {
    const image = await this.findOne(imageId, tenantId);

    // Decrement usage on the previous image if provided
    if (dto.previousImageId && dto.previousImageId !== imageId) {
      await this.decrementUsage(
        dto.previousImageId,
        dto.entityType === 'menu_item' ? 'product' : dto.entityType,
        dto.entityId,
      );
    }

    // Update the entity with new image URLs
    if (dto.entityType === 'product') {
      await this.productRepository.update(dto.entityId, {
        imageUrl: image.ftpUrl,
        thumbnailUrl: image.thumbnailUrl ?? image.ftpUrl,
      });
    } else if (dto.entityType === 'menu_item') {
      await this.menuItemRepository.update(dto.entityId, {
        imageUrl: image.ftpUrl,
        thumbnailUrl: image.thumbnailUrl ?? image.ftpUrl,
      });
    }

    // Increment usage on the new image
    await this.incrementUsage(
      imageId,
      dto.entityType === 'category' ? 'category' : 'product',
      dto.entityId,
    );

    return this.findOne(imageId, tenantId);
  }
}
