import {
  Injectable,
  BadRequestException,
  NotFoundException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Business, BusinessStatus } from './entities/business.entity';
import { Address, AddressType } from './entities/address.entity';
import { Director } from './entities/director.entity';
import { BankDetails } from './entities/bank-details.entity';
import { Store } from './entities/store.entity';
import { Site, SiteType } from '../sites/entities/site.entity';
import { OperatingHour } from './entities/operating-hour.entity';
import { Holiday } from './entities/holiday.entity';
import { CompleteSetupDto } from './dto/complete-setup.dto';
import {
  BusinessBasicsDto,
  DirectorDto,
  BankDetailsDto,
  StoreInfoDto,
  StoreInfoBatchDto,
  BusinessType,
} from './dto/steps.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { encrypt, decrypt } from '../common/utils/crypto.util';
import { ERROR_CODES } from './constants/error-codes';
import { BusinessSetupException } from './exceptions/business-setup.exception';
import { SalesGateway } from '../gateways/sales/sales.gateway';
import { CompaniesHouseService } from '../companies-house/companies-house.service';
import { RedisCacheService } from '../common/cache/redis-cache.service';
import { QueryStoreBusinessesDto } from '../businesses/dto/query-store-businesses.dto/query-store-businesses.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { isUUID } from 'class-validator';

@Injectable()
export class SetupBusinessService {
  private readonly logger = new Logger(SetupBusinessService.name);

  constructor(
    @InjectRepository(Business)
    private businessRepository: Repository<Business>,
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
    @InjectRepository(Director)
    private directorRepository: Repository<Director>,
    @InjectRepository(BankDetails)
    private bankDetailsRepository: Repository<BankDetails>,
    @InjectRepository(Store)
    private storeRepository: Repository<Store>,
    @InjectRepository(OperatingHour)
    private operatingHourRepository: Repository<OperatingHour>,
    @InjectRepository(Holiday)
    private holidayRepository: Repository<Holiday>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
    private salesGateway: SalesGateway,
    private companiesHouseService: CompaniesHouseService,
    private readonly cacheService: RedisCacheService,
  ) {}

  async saveProgress(userId: string, data: CompleteSetupDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let business: Business | null = null;

      if (data.businessId) {
        business = await queryRunner.manager.findOne(Business, {
          where: { id: data.businessId },
          relations: [
            'registeredAddress',
            'directors',
            'bankDetails',
            'stores',
          ],
        });

        if (business && business.userId !== userId) {
          throw new BusinessSetupException(
            ERROR_CODES.UNAUTHORIZED,
            HttpStatus.UNAUTHORIZED,
          );
        }
      }

      // We ONLY save what is actually provided in the partial DTO for auto-save.
      if (data.basics) {
        business = await this.saveStep1(
          queryRunner.manager,
          userId,
          data.basics,
          business ?? undefined,
        );
      }

      if (business) {
        if (data.directors && data.directors.length > 0) {
          await this.saveStep2(queryRunner.manager, business, data.directors);
        }

        if (data.bankDetails) {
          await this.saveStep3(queryRunner.manager, business, data.bankDetails);
        }

        const storeInfos = this.normalizeStep4PayloadFromCompleteSetup(data);
        if (storeInfos.length > 0) {
          await this.saveStep4Batch(queryRunner.manager, business, storeInfos);
        }
      }

      await queryRunner.commitTransaction();
      return { success: true, businessId: business?.id };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private async saveStep1(
    manager: EntityManager,
    userId: string,
    data: BusinessBasicsDto,
    business?: Business,
  ): Promise<Business> {
    const businessToSave =
      business ||
      manager.create(Business, {
        userId,
        status: BusinessStatus.UNSAVED,
      });

    // ERR_VAL_001: Invalid Region Format
    const supportedRegions = ['United Kingdom', 'USA'];
    if (!supportedRegions.includes(data.region)) {
      throw new BusinessSetupException(
        ERROR_CODES.INVALID_REGION,
        HttpStatus.BAD_REQUEST,
      );
    }

    businessToSave.name = data.businessName;
    businessToSave.companyName = data.companyName;
    businessToSave.businessType = data.businessType;
    businessToSave.registrationNumber = data.registrationNumber || '';
    businessToSave.companyEmail = data.companyEmail;
    businessToSave.companyPhone = data.companyPhone;
    businessToSave.region = data.region;

    // Optional: Validate registration number with Companies House if provided
    if (data.registrationNumber && data.region === 'United Kingdom') {
      try {
        const companyInfo = await this.companiesHouseService.searchCompanies({
          q: data.registrationNumber,
          itemsPerPage: 1,
        });

        if (companyInfo.success && companyInfo.data.length > 0) {
          const matchedCompany = companyInfo.data.find(
            (c) => c.companyNumber === data.registrationNumber,
          );
          if (matchedCompany) {
            this.logger.log(
              `Validated company registration number: ${data.registrationNumber}`,
            );
            // Optionally auto-correct company name if it's different
            if (matchedCompany.companyName && !businessToSave.companyName) {
              businessToSave.companyName = matchedCompany.companyName;
            }
          }
        }
      } catch (error: unknown) {
        // We don't want to block the setup if Companies House API is down,
        // but we should log it.
        const message =
          error instanceof Error ? error.message : 'unknown error';
        this.logger.warn(
          `Could not validate registration number ${data.registrationNumber} with Companies House: ${message}`,
        );
      }
    }

    if (data.registeredAddress) {
      if (!businessToSave.registeredAddress) {
        businessToSave.registeredAddress = manager.create(Address, {
          ...data.registeredAddress,
          type: AddressType.REGISTERED,
        });
      } else {
        Object.assign(businessToSave.registeredAddress, data.registeredAddress);
      }
      await manager.save(Address, businessToSave.registeredAddress);
    }

    if (businessToSave.status === BusinessStatus.UNSAVED) {
      businessToSave.status = BusinessStatus.SAVED;
    }

    return await manager.save(Business, businessToSave);
  }

  private async saveStep2(
    manager: EntityManager,
    business: Business,
    data: DirectorDto[],
  ) {
    // ERR_BUS_004: Duplicate Owner Email
    const normalizedEmails = data
      .map((d) => d.email?.trim().toLowerCase())
      .filter((email): email is string => !!email);
    const hasDuplicateEmailsInPayload =
      new Set(normalizedEmails).size !== normalizedEmails.length;
    if (hasDuplicateEmailsInPayload) {
      throw new BusinessSetupException(
        ERROR_CODES.DUPLICATE_OWNER_EMAIL,
        HttpStatus.CONFLICT,
      );
    }

    // Clear existing directors for this business before inserting new ones
    await manager.delete(Director, { businessId: business.id });

    const directors = data.map((d) => {
      const address = manager.create(Address, {
        ...d.residentialAddress,
        type: AddressType.RESIDENTIAL,
      });
      return manager.create(Director, {
        ...d,
        businessId: business.id,
        residentialAddress: address,
      });
    });

    await manager.save(
      Address,
      directors.map((d) => d.residentialAddress),
    );
    await manager.save(Director, directors);
  }

  private async saveStep3(
    manager: EntityManager,
    business: Business,
    data: BankDetailsDto,
  ) {
    // ERR_SEC_003: Payload Decryption Failed (Simulation)
    if (!data.encryptedPayload || data.encryptedPayload === 'invalid-payload') {
      throw new BusinessSetupException(
        ERROR_CODES.DECRYPTION_FAILED,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // Encrypt the payload before storing it
    // If it's an object, stringify it first
    const payloadToEncrypt =
      typeof data.encryptedPayload === 'object'
        ? JSON.stringify(data.encryptedPayload)
        : data.encryptedPayload;

    const encrypted = encrypt(payloadToEncrypt);

    if (!business.bankDetails) {
      business.bankDetails = manager.create(BankDetails, {
        businessId: business.id,
        encryptedPayload: encrypted,
        maskedPreview: data.maskedPreview as Record<string, any>,
      });
    } else {
      business.bankDetails.encryptedPayload = encrypted;
      business.bankDetails.maskedPreview = data.maskedPreview as Record<
        string,
        any
      >;
    }

    business.bankDetails = await manager.save(
      BankDetails,
      business.bankDetails,
    );
  }

  private normalizeStep4Payload(
    data: StoreInfoDto | StoreInfoBatchDto,
  ): StoreInfoDto[] {
    if (Array.isArray((data as StoreInfoBatchDto).stores)) {
      const batch = data as StoreInfoBatchDto;
      if (batch.stores.length === 0) {
        throw new BadRequestException('At least one store is required');
      }
      return batch.stores;
    }
    return [data as StoreInfoDto];
  }

  private normalizeStoreValue(value?: string): string {
    return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private buildStoreAllocationKey(data: StoreInfoDto): string {
    if (data.placeId?.trim()) {
      return `place:${this.normalizeStoreValue(data.placeId)}`;
    }
    return [
      this.normalizeStoreValue(data.storeName),
      this.normalizeStoreValue(data.storeAddress?.street),
      this.normalizeStoreValue(data.storeAddress?.locality),
      this.normalizeStoreValue(data.storeAddress?.region),
      this.normalizeStoreValue(data.storeAddress?.postalCode),
    ].join('|');
  }

  private ensureUniqueStoreAllocations(storeInfos: StoreInfoDto[]) {
    const seenKeys = new Set<string>();
    for (const storeInfo of storeInfos) {
      const allocationKey = this.buildStoreAllocationKey(storeInfo);
      if (seenKeys.has(allocationKey)) {
        throw new BadRequestException(
          `Duplicate store allocation in request for store "${storeInfo.storeName}"`,
        );
      }
      seenKeys.add(allocationKey);
    }
  }

  private async saveStep4Batch(
    manager: EntityManager,
    business: Business,
    data: StoreInfoDto[],
  ) {
    this.ensureUniqueStoreAllocations(data);
    for (const storeInfo of data) {
      await this.saveStep4(manager, business, storeInfo);
    }
  }

  private async saveStep4(
    manager: EntityManager,
    business: Business,
    data: StoreInfoDto,
  ) {
    const allocationKey = this.buildStoreAllocationKey(data);

    const existingByAllocation = await manager.findOne(Store, {
      where: { allocationKey },
      relations: ['storeAddress', 'operatingHours', 'holidays'],
    });

    let store: Store | null = null;

    if (existingByAllocation) {
      if (existingByAllocation.businessId !== business.id) {
        const existingBusiness = await manager.findOne(Business, {
          where: { id: existingByAllocation.businessId },
        });

        if (!existingBusiness) {
          throw new BadRequestException(
            `Store "${data.storeName}" is already assigned to a business that no longer exists.`,
          );
        }

        const [existingOwner, currentOwner] = await Promise.all([
          manager.findOne(User, { where: { id: existingBusiness.userId } }),
          manager.findOne(User, { where: { id: business.userId } }),
        ]);

        const sameUser = existingBusiness.userId === business.userId;
        const sameTenant =
          existingOwner &&
          currentOwner &&
          existingOwner.tenantId === currentOwner.tenantId;

        if (!sameUser && !sameTenant) {
          throw new BadRequestException(
            `Store "${data.storeName}" is already assigned to another business`,
          );
        }

        existingByAllocation.businessId = business.id;
        await manager.save(existingByAllocation);
      }
      // Re-use the existing allocated store record to avoid unique constraint violations
      store = existingByAllocation;
    }

    if (!store && data.storeId) {
      if (!isUUID(data.storeId)) {
        throw new BadRequestException('Invalid storeId format');
      }
      store = await manager.findOne(Store, {
        where: { id: data.storeId },
        relations: ['storeAddress', 'operatingHours', 'holidays'],
      });
      if (!store) {
        throw new NotFoundException(`Store ${data.storeId} not found`);
      }
      if (store.businessId !== business.id) {
        const owningBusiness = await manager.findOne(Business, {
          where: { id: store.businessId },
        });

        if (!owningBusiness) {
          throw new BadRequestException(
            `Store "${store.name}" is already assigned to another business`,
          );
        }

        const [existingOwner, currentOwner] = await Promise.all([
          manager.findOne(User, { where: { id: owningBusiness.userId } }),
          manager.findOne(User, { where: { id: business.userId } }),
        ]);

        const sameUser = owningBusiness.userId === business.userId;
        const sameTenant =
          existingOwner?.tenantId &&
          currentOwner?.tenantId &&
          existingOwner.tenantId === currentOwner.tenantId;

        if (!sameUser && !sameTenant) {
          throw new BadRequestException(
            `Store "${store.name}" is already assigned to another business`,
          );
        }

        store.businessId = business.id;
      }
    }

    if (!store) {
      store = manager.create(Store, {
        businessId: business.id,
        name: data.storeName || business.name,
        currency: data.currency || 'GBP',
        is_24_7: data.is24_7 || false,
        allocationKey,
        placeId: data.placeId || null,
        selectedChannels: data.selectedChannels || undefined,
      });
    } else {
      store.name = data.storeName || store.name || business.name;
      store.currency = data.currency || store.currency || 'GBP';
      if (data.is24_7 !== undefined) store.is_24_7 = data.is24_7;
      store.allocationKey = allocationKey;
      if (data.placeId !== undefined) store.placeId = data.placeId || null;
      if (data.selectedChannels !== undefined) {
        store.selectedChannels = data.selectedChannels || undefined;
      }
    }

    if (data.storeAddress) {
      if (!store.storeAddress) {
        store.storeAddress = manager.create(Address, {
          ...data.storeAddress,
          type: AddressType.SITE,
        });
      } else {
        Object.assign(store.storeAddress, data.storeAddress);
      }
      await manager.save(Address, store.storeAddress);
    }

    await manager.save(Store, store);

    // Emit store update/creation events
    if (this.salesGateway.server) {
      this.salesGateway.server.emit('store_updated', store);
    }

    // Operating Hours
    if (store.operatingHours) {
      await manager.remove(OperatingHour, store.operatingHours);
    }
    if (data.dailyTimeSlots) {
      const hours = data.dailyTimeSlots.map((h) =>
        manager.create(OperatingHour, { ...h, storeId: store.id }),
      );
      await manager.save(OperatingHour, hours);
    }

    // Holidays
    if (store.holidays) {
      await manager.remove(Holiday, store.holidays);
    }
    if (data.holidays) {
      const holidays = data.holidays.map((h) =>
        manager.create(Holiday, { ...h, storeId: store.id }),
      );
      await manager.save(Holiday, holidays);
    }
  }

  async submitSetup(userId: string, data: CompleteSetupDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let business: Business | null = null;

      if (data.businessId) {
        if (!isUUID(data.businessId)) {
          throw new BadRequestException('Invalid businessId format');
        }

        business = await queryRunner.manager.findOne(Business, {
          where: { id: data.businessId },
          relations: [
            'registeredAddress',
            'directors',
            'bankDetails',
            'stores',
          ],
        });

        if (!business) {
          throw new NotFoundException('Business not found');
        }

        if (business.userId !== userId) {
          throw new BusinessSetupException(
            ERROR_CODES.UNAUTHORIZED,
            HttpStatus.UNAUTHORIZED,
          );
        }
      }

      // 1. Final server-side validation (already handled by DTO class-validator)
      // 2. Perform tenant-aware naming validation and business rules validation
      await this.validateTenantNamingRules(userId, data);
      this.validateBusinessRules(data);

      // 3. Save all data (re-using step logic)
      business = await this.saveStep1(
        queryRunner.manager,
        userId,
        data.basics,
        business ?? undefined,
      );
      await this.saveStep2(queryRunner.manager, business, data.directors);
      await this.saveStep3(queryRunner.manager, business, data.bankDetails);
      await this.saveStep4Batch(
        queryRunner.manager,
        business,
        this.normalizeStep4PayloadFromCompleteSetup(data),
      );

      // 4. Submit setup: update status
      await queryRunner.manager.update(
        Business,
        { id: business.id },
        { status: BusinessStatus.PENDING_REVIEW },
      );

      // 4.1 Update user's tenantId if not set
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });
      if (user && !user.tenantId) {
        // Use business ID as the tenant ID for now
        await queryRunner.manager.update(
          User,
          { id: userId },
          { tenantId: business.id },
        );
        this.logger.log(`Assigned tenantId ${business.id} to user ${userId}`);
      }

      // 5. Create Sites for selected channels
      const storeInfos = this.normalizeStep4PayloadFromCompleteSetup(data);
      const primaryStore = storeInfos.length > 0 ? storeInfos[0] : null;
      // Using data.storeInfo?.selectedChannels as fallback if not present in normalized array
      const channels = primaryStore?.selectedChannels ||
        data.storeInfo?.selectedChannels || ['pos'];

      for (const channel of channels) {
        const siteType = this.mapChannelToSiteType(channel);

        // Check if this channel already exists
        const existingSite = await queryRunner.manager.findOne(Site, {
          where: { businessId: business.id, type: siteType },
        });

        if (!existingSite) {
          const siteName = primaryStore?.storeName
            ? `${primaryStore.storeName} (${channel.toUpperCase()})`
            : `${business.name} (${channel.toUpperCase()})`;

          const siteStoreId =
            business.stores && business.stores.length > 0
              ? business.stores[0].id
              : null;

          const newSite = queryRunner.manager.create(Site, {
            businessId: business.id,
            storeId: siteStoreId,
            name: siteName,
            type: siteType,
            currency: primaryStore?.currency || 'GBP',
            isActive: true,
          } as any);
          await queryRunner.manager.save(Site, newSite);
        } else {
          // Sync primary store info to the existing site
          existingSite.name = primaryStore?.storeName
            ? `${primaryStore.storeName} (${channel.toUpperCase()})`
            : existingSite.name;
          existingSite.currency =
            primaryStore?.currency || existingSite.currency || 'GBP';

          if (
            !existingSite.storeId &&
            business.stores &&
            business.stores.length > 0
          ) {
            existingSite.storeId = business.stores[0].id;
          }
          await queryRunner.manager.save(Site, existingSite);
        }
      }

      await queryRunner.commitTransaction();

      await this.cacheService.delByPrefix(`store:list:${userId}:`);

      this.eventEmitter.emit('business.setup.completed', {
        businessId: business.id,
        status: 'active',
      });

      try {
        this.logger.log(`Emitted setup completed event for ${business.id}`);
        this.salesGateway.emitBusinessUpdated(business);
        this.salesGateway.emitStoreRecordUpdated();
      } catch (eventErr: unknown) {
        const message =
          eventErr instanceof Error ? eventErr.message : String(eventErr);
        this.logger.error(`Error emitting setup completed event: ${message}`);
      }

      return { success: true, businessId: business.id };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Tenant-aware naming rules:
   * - Primary tenant (no tenantId) is allowed to reuse the same name
   *   for business, company, and its first store. This reflects the
   *   real-world case where a single-tenant account often starts with
   *   one brand and one location sharing the same name.
   * - For all non-primary tenants (tenantId is set), the three names
   *   must be distinct. This keeps data clear across multiple brands
   *   and locations owned by the same tenant and avoids ambiguity in
   *   reporting, billing, and store assignment.
   */
  private async validateTenantNamingRules(
    userId: string,
    data: CompleteSetupDto,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    const isPrimaryTenant = !user || !user.tenantId;
    if (isPrimaryTenant) {
      return;
    }

    const normalizeName = (value?: string) =>
      (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

    const businessName = normalizeName(data.basics?.businessName);
    const companyName = normalizeName(data.basics?.companyName);

    if (businessName && companyName && businessName === companyName) {
      throw new BadRequestException(
        'Business name and company name must be different for this tenant',
      );
    }
    const storeInfos = this.normalizeStep4PayloadFromCompleteSetup(data);
    if (storeInfos.length > 0) {
      const primaryStore = storeInfos[0];
      const storeName = normalizeName(primaryStore?.storeName);

      if (businessName && storeName && businessName === storeName) {
        throw new BadRequestException(
          'Business name and store name must be different for this tenant',
        );
      }

      if (companyName && storeName && companyName === storeName) {
        throw new BadRequestException(
          'Company name and store name must be different for this tenant',
        );
      }
    }
  }

  private validateBusinessRules(data: CompleteSetupDto) {
    if (!data.basics) return;

    // 1. Business Type Rules
    const soleTypes = [
      BusinessType.SOLE_TRADER,
      BusinessType.SOLE_PROPRIETORSHIP,
      BusinessType.SOLE_ESTABLISHMENT,
    ];
    const limitedTypes = [
      BusinessType.LIMITED_COMPANY,
      BusinessType.LLC,
      BusinessType.CORPORATION,
      BusinessType.LLP,
      BusinessType.COMPANY,
      BusinessType.PVT,
      BusinessType.PRIVATE_LIMITED,
      BusinessType.SMC,
    ];

    if (soleTypes.includes(data.basics.businessType)) {
      if (data.directors.length < 1 || data.directors.length > 2) {
        throw new BadRequestException(
          `${data.basics.businessType} must have 1-2 owners`,
        );
      }
    } else if (limitedTypes.includes(data.basics.businessType)) {
      if (data.directors.length < 1 || data.directors.length > 10) {
        throw new BadRequestException(
          `${data.basics.businessType} must have 1-10 directors`,
        );
      }
      if (!data.basics.registrationNumber) {
        throw new BadRequestException(
          `Registration number is required for ${data.basics.businessType}`,
        );
      }
      if (!/^[a-zA-Z0-9]{1,12}$/.test(data.basics.registrationNumber)) {
        throw new BadRequestException(
          `Invalid Registration Number format for ${data.basics.businessType} (Max 12 alphanumeric)`,
        );
      }
    }

    // 2. Director Rules
    if (data.directors) {
      const emails = new Set<string>();
      for (const director of data.directors) {
        // Age check (>= 16)
        if (director.dob) {
          const dob = this.parseDate(director.dob);
          const age = this.calculateAge(dob);
          if (age < 16) {
            throw new BadRequestException(
              `Director ${director.firstName} must be at least 16 years old`,
            );
          }
        }

        // Unique email check
        if (director.email) {
          if (emails.has(director.email)) {
            throw new BadRequestException(
              `Duplicate director email: ${director.email}`,
            );
          }
          emails.add(director.email);
        }
      }
    }

    const storeInfos = this.normalizeStep4PayloadFromCompleteSetup(data);
    this.ensureUniqueStoreAllocations(storeInfos);

    // 3. Store Rules
    for (const storeInfo of storeInfos) {
      if (!storeInfo.is24_7) {
        if (
          !storeInfo.dailyTimeSlots ||
          storeInfo.dailyTimeSlots.length === 0
        ) {
          throw new BadRequestException(
            `Operating hours are required for store "${storeInfo.storeName}" if not 24/7`,
          );
        }
        for (const slot of storeInfo.dailyTimeSlots) {
          if (slot.open_time === slot.close_time) {
            throw new BadRequestException(
              `Open and close time cannot be equal for ${slot.day}`,
            );
          }
        }
      }

      // 4. Holiday Rules
      if (storeInfo.holidays) {
        const dates = new Set<string>();
        for (const holiday of storeInfo.holidays) {
          if (dates.has(holiday.date)) {
            throw new BadRequestException(
              `Duplicate holiday date: ${holiday.date}`,
            );
          }
          dates.add(holiday.date);
        }
      }
    }
  }

  private normalizeStep4PayloadFromCompleteSetup(
    data: CompleteSetupDto,
  ): StoreInfoDto[] {
    const rawData = data as unknown as Record<string, unknown>;
    if (Array.isArray(rawData.storeInfos) && rawData.storeInfos.length > 0) {
      return rawData.storeInfos as StoreInfoDto[];
    }
    if (Array.isArray(rawData.siteInfos) && rawData.siteInfos.length > 0) {
      return rawData.siteInfos as StoreInfoDto[];
    }
    if (rawData.storeInfo) {
      return [rawData.storeInfo as StoreInfoDto];
    }
    if (rawData.siteInfo) {
      return [rawData.siteInfo as StoreInfoDto];
    }
    return [];
  }

  private parseDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  }

  private calculateAge(dob: Date): number {
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  }

  async getBusiness(userId: string, id: string) {
    const business = await this.businessRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.registeredAddress', 'registeredAddress')
      .leftJoinAndSelect('business.directors', 'directors')
      .leftJoinAndSelect('directors.residentialAddress', 'directorAddress')
      .leftJoinAndSelect('business.bankDetails', 'bankDetails')
      .leftJoinAndSelect('business.stores', 'stores')
      .leftJoinAndSelect('stores.storeAddress', 'storeAddress')
      .leftJoinAndSelect('stores.operatingHours', 'operatingHours')
      .leftJoinAndSelect('stores.holidays', 'holidays')
      .leftJoinAndSelect('business.sites', 'sites')
      .leftJoinAndSelect('business.departments', 'departments')
      .leftJoinAndSelect('business.employees', 'employees')
      .leftJoinAndSelect('employees.department', 'employeeDepartment')
      .leftJoinAndSelect('business.settings', 'settings')
      .leftJoinAndSelect('business.configurations', 'configurations')
      .where('business.id = :id', { id })
      .andWhere('business.userId = :userId', { userId })
      .orderBy('stores.updatedAt', 'DESC')
      .addOrderBy('operatingHours.day', 'ASC')
      .addOrderBy('holidays.date', 'ASC')
      .getOne();

    if (!business) {
      throw new NotFoundException('Business not found or unauthorized');
    }

    return business;
  }

  async listBusinesses(
    userId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ) {
    const queryBuilder = this.businessRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.registeredAddress', 'registeredAddress')
      .leftJoinAndSelect('business.directors', 'directors')
      .leftJoinAndSelect('business.bankDetails', 'bankDetails')
      .leftJoinAndSelect('business.stores', 'stores')
      .leftJoinAndSelect('business.sites', 'sites')
      .where('business.userId = :userId', { userId });

    if (search) {
      queryBuilder.andWhere(
        '(business.name ILIKE :search OR business.companyName ILIKE :search OR sites.name ILIKE :search OR stores.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .orderBy(`business.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, totalItems] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  private buildStoreListQuery(
    userId: string,
    status: 'incomplete' | 'submitted',
    query: QueryStoreBusinessesDto,
    role?: UserRole,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'DESC';
    const allowedSortBy = new Set([
      'name',
      'companyName',
      'status',
      'createdAt',
      'updatedAt',
    ]);
    const normalizedSortBy = allowedSortBy.has(sortBy) ? sortBy : 'createdAt';
    const queryBuilder = this.businessRepository
      .createQueryBuilder('business')
      .leftJoinAndSelect('business.registeredAddress', 'registeredAddress')
      .leftJoinAndSelect('business.stores', 'stores')
      .leftJoinAndSelect('business.sites', 'sites');

    if (role !== UserRole.ADMIN) {
      queryBuilder.where('business.userId = :userId', { userId });
    }

    if (status === 'submitted') {
      queryBuilder.andWhere('business.status IN (:...submittedStatuses)', {
        submittedStatuses: [
          BusinessStatus.SUBMITTED,
          BusinessStatus.PENDING_REVIEW,
          BusinessStatus.ACTIVE,
          BusinessStatus.PENDING,
        ],
      });
    } else {
      queryBuilder.andWhere('business.status IN (:...incompleteStatuses)', {
        incompleteStatuses: [BusinessStatus.UNSAVED, BusinessStatus.SAVED],
      });

      // Hide drafts that have the same name as a submitted store for this user.
      // This avoids showing older incomplete versions once a store
      // with the same name has been fully submitted.
      queryBuilder.andWhere(
        `NOT EXISTS (
          SELECT 1
          FROM businesses submitted
          WHERE submitted."user_id" = business."user_id"
            AND submitted.status = :submittedStatus
            AND submitted.name = business.name
            AND submitted."companyName" = business."companyName"
        )`,
        {
          submittedStatus: BusinessStatus.SUBMITTED,
        },
      );
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(business.name ILIKE :search OR business.companyName ILIKE :search OR sites.name ILIKE :search OR stores.name ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.dateFrom) {
      queryBuilder.andWhere('business.createdAt >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    }

    if (query.dateTo) {
      queryBuilder.andWhere('business.createdAt <= :dateTo', {
        dateTo: query.dateTo,
      });
    }

    queryBuilder
      .orderBy(`business.${normalizedSortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    return { queryBuilder, page, limit };
  }

  async listStoreBusinesses(
    userId: string,
    status: 'incomplete' | 'submitted',
    query: QueryStoreBusinessesDto,
    role?: UserRole,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const cacheKey = `store:list:${userId}:${status}:${JSON.stringify(query)}:${role || 'none'}`;
    const cachedResult = await this.cacheService.get<{
      data: Business[];
      meta: {
        totalItems: number;
        itemCount: number;
        itemsPerPage: number;
        totalPages: number;
        currentPage: number;
      };
    }>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    this.logger.log(
      `Listing ${status} stores for user ${userId}. Incomplete statuses: ${[BusinessStatus.UNSAVED, BusinessStatus.SAVED]}`,
    );
    const { queryBuilder } = this.buildStoreListQuery(
      userId,
      status,
      query,
      role,
    );
    const [data, totalItems] = await queryBuilder.getManyAndCount();
    this.logger.log(`Found ${totalItems} ${status} stores for user ${userId}`);
    const result = {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
    await this.cacheService.set(cacheKey, result, 90);
    this.logger.log(
      `Listed ${status} stores for user ${userId} role ${role} page ${page} limit ${limit}`,
    );
    return result;
  }

  async exportStoreBusinessesCsv(
    userId: string,
    status: 'incomplete' | 'submitted',
    query: QueryStoreBusinessesDto,
    role?: UserRole,
  ): Promise<string> {
    const exportQuery = {
      ...query,
      page: 1,
      limit: 10000,
    };
    const { queryBuilder } = this.buildStoreListQuery(
      userId,
      status,
      exportQuery,
      role,
    );
    const businesses = await queryBuilder.getMany();
    const header = [
      'id',
      'name',
      'companyName',
      'status',
      'companyEmail',
      'companyPhone',
      'createdAt',
      'updatedAt',
    ];
    const rows = businesses.map((business) =>
      [
        business.id,
        business.name ?? '',
        business.companyName ?? '',
        business.status ?? '',
        business.companyEmail ?? '',
        business.companyPhone ?? '',
        business.createdAt?.toISOString() ?? '',
        business.updatedAt?.toISOString() ?? '',
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(','),
    );
    this.logger.log(
      `Exported ${businesses.length} ${status} stores to CSV for user ${userId}`,
    );
    return `${header.join(',')}\n${rows.join('\n')}`;
  }

  async getBankDetails(userId: string, businessId: string) {
    const business = await this.businessRepository.findOne({
      where: { id: businessId, userId },
      relations: ['bankDetails'],
    });

    if (!business) {
      throw new NotFoundException('Business not found or unauthorized');
    }

    if (!business.bankDetails) {
      throw new NotFoundException('Bank details not found for this business');
    }

    try {
      const decryptedPayload = decrypt(business.bankDetails.encryptedPayload);
      return {
        id: business.bankDetails.id,
        businessId: business.bankDetails.businessId,
        maskedPreview: business.bankDetails.maskedPreview as Record<
          string,
          any
        >,
        decryptedPayload: JSON.parse(decryptedPayload) as Record<string, any>,
      };
    } catch {
      throw new BusinessSetupException(
        ERROR_CODES.DECRYPTION_FAILED,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private mapChannelToSiteType(channel: string): SiteType {
    switch (channel.toLowerCase()) {
      case 'pos':
        return SiteType.POS;
      case 'web':
        return SiteType.ECOMMERCE;
      case 'mobile':
      case 'marketplace':
        return SiteType.MARKETPLACE;
      default:
        return SiteType.POS;
    }
  }
}
