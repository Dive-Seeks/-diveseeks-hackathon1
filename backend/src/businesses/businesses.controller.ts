import {
  Controller,
  ForbiddenException,
  Get,
  Logger,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SetupBusinessService } from '../setup-business/setup-business.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { QueryStoreBusinessesDto } from './dto/query-store-businesses.dto/query-store-businesses.dto';
import {
  STORE_RECORD_ACCESS_ROLES,
  UserRole,
} from '../users/entities/user.entity';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    tenantId?: string;
    storeId?: string;
    role?: UserRole;
  };
}

@ApiTags('Businesses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses')
export class BusinessesController {
  private readonly logger = new Logger(BusinessesController.name);

  constructor(private readonly setupBusinessService: SetupBusinessService) {}

  private assertStoreRoleAccess(role?: UserRole) {
    if (!role || !STORE_RECORD_ACCESS_ROLES.has(role)) {
      this.logger.warn(
        `User with role ${role} attempted to access store records without proper permissions`,
      );
      throw new ForbiddenException(
        'Insufficient role permissions to access store records',
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'List all businesses for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Return list of businesses with pagination',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  async list(
    @Req() req: RequestWithUser,
    @Query() query: QueryStoreBusinessesDto,
  ) {
    const { userId } = req.user;
    return this.setupBusinessService.listBusinesses(
      userId,
      query.page,
      query.limit,
      query.search,
      query.sortBy,
      query.sortOrder,
    );
  }

  @Get('store/incomplete')
  @ApiOperation({
    summary:
      'List incomplete and unsubmitted businesses for authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Return incomplete businesses with pagination and filters',
  })
  async listIncomplete(
    @Req() req: RequestWithUser,
    @Query() query: QueryStoreBusinessesDto,
  ) {
    this.assertStoreRoleAccess(req.user.role);
    this.logger.log(
      `Fetching incomplete stores for user ${req.user.userId} with page ${query.page}`,
    );
    return this.setupBusinessService.listStoreBusinesses(
      req.user.userId,
      'incomplete',
      query,
      req.user.role,
    );
  }

  @Get('store/submitted')
  @ApiOperation({
    summary: 'List submitted businesses for authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Return submitted businesses with pagination and filters',
  })
  async listSubmitted(
    @Req() req: RequestWithUser,
    @Query() query: QueryStoreBusinessesDto,
  ) {
    this.assertStoreRoleAccess(req.user.role);
    try {
      const result = await this.setupBusinessService.listStoreBusinesses(
        req.user.userId,
        'submitted',
        query,
        req.user.role,
      );
      this.logger.debug(
        `listSubmitted success for user ${req.user.userId}: Found ${result.data?.length || 0} stores`,
      );
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `listSubmitted failed for user ${req.user.userId}: ${errorMessage}`,
        errorStack,
      );
      throw error;
    }
  }

  @Get('store/:status/export')
  @ApiOperation({
    summary: 'Export store records as CSV for authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Return CSV export for requested store status',
  })
  async exportStores(
    @Req() req: RequestWithUser,
    @Param('status') status: 'incomplete' | 'submitted',
    @Query() query: QueryStoreBusinessesDto,
    @Res() res: Response,
  ) {
    this.assertStoreRoleAccess(req.user.role);
    if (status !== 'incomplete' && status !== 'submitted') {
      throw new ForbiddenException('Invalid export status');
    }
    const csvContent = await this.setupBusinessService.exportStoreBusinessesCsv(
      req.user.userId,
      status,
      query,
      req.user.role,
    );
    const fileName = `stores-${status}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.status(200).send(csvContent);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single business with full details' })
  @ApiResponse({
    status: 200,
    description: 'Return business with all relations',
  })
  @ApiResponse({ status: 404, description: 'Business not found' })
  async getOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    const { userId } = req.user;
    const business = await this.setupBusinessService.getBusiness(userId, id);
    if (!business) {
      return business;
    }

    return {
      success: true,
      data: {
        stores:
          business.stores?.map((store) => ({
            id: store.id,
            name: store.name,
            currency: store.currency,
            region: store.storeAddress?.region,
            is_24_7: store.is_24_7,
            storeAddress: store.storeAddress,
            operatingHours: store.operatingHours,
            holidays: store.holidays,
            placeId: store.placeId,
          })) || [],
        sites:
          business.sites?.map((site) => ({
            id: site.id,
            name: site.name,
            type: site.type,
            isActive: site.isActive,
            businessId: site.businessId,
          })) || [],
      },
    };
  }

  @Get(':id/relations')
  @ApiOperation({ summary: 'Get all related data for a specific business' })
  @ApiResponse({
    status: 200,
    description: 'Return business with all relations (Alias for getOne)',
  })
  async getRelations(@Req() req: RequestWithUser, @Param('id') id: string) {
    return this.getOne(req, id);
  }
}
