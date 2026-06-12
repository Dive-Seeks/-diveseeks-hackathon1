import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  MarketplaceListing,
  AssetType,
  ListingVisibility,
  ModerationStatus,
} from '../entities/marketplace-listing.entity';
import { MarketplaceVersion } from '../entities/marketplace-version.entity';
import {
  MarketplaceInstall,
  InstallStatus,
} from '../entities/marketplace-install.entity';
import { MarketplaceReview } from '../entities/marketplace-review.entity';
import {
  CreateListingDto,
  PublishVersionDto,
  InstallDto,
  CreateReviewDto,
  QueryListingsDto,
} from '../dto/marketplace.dto';

@Injectable()
export class ListingService {
  constructor(
    @InjectRepository(MarketplaceListing)
    private readonly listingRepo: Repository<MarketplaceListing>,
    @InjectRepository(MarketplaceVersion)
    private readonly versionRepo: Repository<MarketplaceVersion>,
    @InjectRepository(MarketplaceInstall)
    private readonly installRepo: Repository<MarketplaceInstall>,
    @InjectRepository(MarketplaceReview)
    private readonly reviewRepo: Repository<MarketplaceReview>,
  ) {}

  async create(
    dto: CreateListingDto,
    publisherTenantId: string,
    publisherUserId: string,
  ): Promise<MarketplaceListing> {
    const existing = await this.listingRepo.findOne({
      where: { slug: dto.slug },
    });
    if (existing)
      throw new ConflictException(`Listing slug "${dto.slug}" already exists`);

    return this.listingRepo.save(
      this.listingRepo.create({
        slug: dto.slug,
        assetType: dto.assetType,
        assetId: dto.assetId,
        publisherTenantId,
        publisherUserId,
        title: dto.title,
        description: dto.description,
        tags: dto.tags ?? [],
        visibility: dto.visibility ?? ListingVisibility.PUBLIC,
        licenseSpdx: dto.licenseSpdx,
        priceModel: dto.priceModel,
        pricePence: dto.pricePence,
        moderation: ModerationStatus.PENDING,
        installCount: 0,
        rating: 0,
        ratingCount: 0,
        verified: false,
      }),
    );
  }

  async publishVersion(
    listingId: string,
    dto: PublishVersionDto,
    tenantId: string,
  ): Promise<MarketplaceVersion> {
    const listing = await this.findOwned(listingId, tenantId);

    const payloadStr = JSON.stringify(dto.payload);
    const contentHash = crypto
      .createHash('sha256')
      .update(payloadStr)
      .digest('hex');

    const version = await this.versionRepo.save(
      this.versionRepo.create({
        listingId,
        version: dto.version,
        contentHash,
        payload: dto.payload,
        dependencies: dto.dependencies ?? [],
        changelog: dto.changelog,
      }),
    );

    await this.listingRepo.update(listingId, { currentVersionId: version.id });
    return version;
  }

  async query(query: QueryListingsDto): Promise<MarketplaceListing[]> {
    const qb = this.listingRepo
      .createQueryBuilder('l')
      .where('l.visibility = :vis', { vis: ListingVisibility.PUBLIC })
      .andWhere('l.moderation = :mod', { mod: ModerationStatus.APPROVED });

    if (query.assetType)
      qb.andWhere('l.assetType = :type', { type: query.assetType });
    if (query.tag) qb.andWhere(':tag = ANY(l.tags)', { tag: query.tag });
    if (query.search) {
      qb.andWhere('(l.title ILIKE :search OR l.description ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    return qb
      .orderBy('l.installCount', 'DESC')
      .limit(query.limit ?? 20)
      .offset(query.offset ?? 0)
      .getMany();
  }

  async findOne(slug: string): Promise<MarketplaceListing> {
    const listing = await this.listingRepo.findOne({ where: { slug } });
    if (!listing) throw new NotFoundException(`Listing "${slug}" not found`);
    return listing;
  }

  async install(
    listingId: string,
    dto: InstallDto,
    tenantId: string,
    userId: string,
  ): Promise<MarketplaceInstall> {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId },
    });
    if (!listing) throw new NotFoundException(`Listing ${listingId} not found`);

    const version = await this.versionRepo.findOne({
      where: { id: dto.versionId, listingId },
    });
    if (!version) throw new NotFoundException(`Version not found`);

    const existing = await this.installRepo.findOne({
      where: { listingId, tenantId, status: InstallStatus.INSTALLED },
    });
    if (existing) throw new ConflictException('Already installed');

    const install = await this.installRepo.save(
      this.installRepo.create({
        listingId,
        versionId: dto.versionId,
        tenantId,
        installedBy: userId,
        status: InstallStatus.INSTALLED,
      }),
    );

    await this.listingRepo.increment({ id: listingId }, 'installCount', 1);
    return install;
  }

  async createReview(
    listingId: string,
    dto: CreateReviewDto,
    tenantId: string,
    userId: string,
  ): Promise<MarketplaceReview> {
    const existing = await this.reviewRepo.findOne({
      where: { listingId, userId },
    });
    if (existing) throw new ConflictException('Already reviewed');

    const review = await this.reviewRepo.save(
      this.reviewRepo.create({
        listingId,
        tenantId,
        userId,
        rating: dto.rating,
        body: dto.body,
      }),
    );

    const [{ avg }] = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .where('r.listingId = :id', { id: listingId })
      .getRawMany();

    await this.listingRepo.update(listingId, {
      rating: parseFloat(Number(avg).toFixed(1)),
    });
    await this.listingRepo.increment({ id: listingId }, 'ratingCount', 1);

    return review;
  }

  async listVersions(listingId: string): Promise<MarketplaceVersion[]> {
    return this.versionRepo.find({
      where: { listingId },
      order: { createdAt: 'DESC' },
    });
  }

  async moderate(
    listingId: string,
    moderation: ModerationStatus,
  ): Promise<void> {
    await this.listingRepo.update(listingId, { moderation });
  }

  private async findOwned(
    listingId: string,
    tenantId: string,
  ): Promise<MarketplaceListing> {
    const listing = await this.listingRepo.findOne({
      where: { id: listingId, publisherTenantId: tenantId },
    });
    if (!listing)
      throw new NotFoundException(
        `Listing ${listingId} not found or not owned by tenant`,
      );
    return listing;
  }
}
