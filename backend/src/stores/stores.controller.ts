import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { StoresService } from './stores.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { StoreListResponseDto } from './dto/store-response.dto';

interface RequestWithUser extends Request {
  user: { userId: string };
}

@ApiTags('Stores')
@ApiBearerAuth()
@Controller('stores')
@UseGuards(JwtAuthGuard)
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @ApiOperation({ summary: 'List physical store locations' })
  @ApiResponse({ status: 200, type: StoreListResponseDto })
  async findAll(@Req() req: RequestWithUser): Promise<StoreListResponseDto> {
    const { userId } = req.user;
    const stores = await this.storesService.findAll(userId);
    return {
      data: stores.map((store) => ({
        id: store.id,
        name: store.name,
        currency: store.currency,
        is_24_7: store.is_24_7,
        businessId: store.businessId,
        storeAddress: store.storeAddress
          ? {
              street: store.storeAddress.street,
              locality: store.storeAddress.locality,
              region: store.storeAddress.region,
              postalCode: store.storeAddress.postalCode,
              country: '',
            }
          : null,
        placeId: store.placeId ?? null,
      })),
      total: stores.length,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific store by ID' })
  async findOne(@Param('id') id: string) {
    return this.storesService.findOne(id);
  }
}
