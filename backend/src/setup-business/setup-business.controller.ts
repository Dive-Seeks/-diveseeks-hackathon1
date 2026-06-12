import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { SetupBusinessService } from './setup-business.service';
import { CompleteSetupDto } from './dto/complete-setup.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { CompaniesHouseService } from '../companies-house/companies-house.service';
import { SearchCompaniesQueryDto } from '../companies-house/dto/search-companies-query.dto';
import { CompanyPeopleQueryDto } from '../companies-house/dto/company-people-query.dto';

interface RequestWithUser extends Request {
  user: { userId: string };
}

@Controller('setup-business')
@UseGuards(JwtAuthGuard)
export class SetupBusinessController {
  constructor(
    private readonly setupBusinessService: SetupBusinessService,
    private readonly companiesHouseService: CompaniesHouseService,
  ) {}

  @Patch('progress/:step')
  async saveProgress(
    @Req() req: RequestWithUser,
    @Param('step', ParseIntPipe) step: number, // Note: param kept for backward compatibility with frontend route mapping but we pass full body
    @Body() body: any,
    @Query('businessId') businessId?: string,
  ) {
    const data = body.data || body; // Support both {data: {}} and direct {}
    const { userId } = req.user;
    if (businessId) {
      data.businessId = businessId;
    }

    // Auto-map legacy frontend fields if necessary for progress save
    if (data.siteInfo && !data.storeInfo) {
      data.storeInfo = data.siteInfo;
    }
    if (data.siteInfos && !data.storeInfos) {
      data.storeInfos = data.siteInfos;
    }

    const result = await this.setupBusinessService.saveProgress(userId, data);
    return {
      success: true,
      businessId: result.businessId,
    };
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  async submit(
    @Req() req: RequestWithUser,
    @Body() completeSetupDto: CompleteSetupDto,
  ) {
    const { userId } = req.user;

    // Auto-map legacy frontend fields if necessary
    if (completeSetupDto.siteInfo && !completeSetupDto.storeInfo) {
      completeSetupDto.storeInfo = completeSetupDto.siteInfo;
    }
    if (completeSetupDto.siteInfos && !completeSetupDto.storeInfos) {
      completeSetupDto.storeInfos = completeSetupDto.siteInfos;
    }

    return this.setupBusinessService.submitSetup(userId, completeSetupDto);
  }

  // private mapLegacySiteToStore removed

  @Get()
  async list(
    @Req() req: RequestWithUser,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const { userId } = req.user;
    return this.setupBusinessService.listBusinesses(
      userId,
      Number(page),
      Number(limit),
    );
  }

  @Get('companies/search')
  async searchCompanies(@Query() query: SearchCompaniesQueryDto) {
    return this.companiesHouseService.searchCompanies(query);
  }

  @Get('companies/comprehensive-search')
  async comprehensiveSearch(@Query('q') q: string) {
    if (!q) {
      throw new BadRequestException(
        'Query parameter "q" is required for comprehensive search',
      );
    }
    return this.companiesHouseService.getComprehensiveCompanyInfo(q);
  }

  @Get('companies/:companyNumber/people')
  async getCompanyPeople(
    @Param('companyNumber') companyNumber: string,
    @Query() query: CompanyPeopleQueryDto,
  ) {
    return this.companiesHouseService.getCompanyPeople(companyNumber, query);
  }

  @Get(':id')
  async getOne(@Req() req: RequestWithUser, @Param('id') id: string) {
    const { userId } = req.user;
    return await this.setupBusinessService.getBusiness(userId, id);
  }

  @Get(':id/bank-details')
  async getBankDetails(@Req() req: RequestWithUser, @Param('id') id: string) {
    const { userId } = req.user;
    return this.setupBusinessService.getBankDetails(userId, id);
  }
}
