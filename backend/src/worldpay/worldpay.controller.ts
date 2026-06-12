import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WorldpayService } from './worldpay.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: { id: string; email: string; role: string };
}

@ApiTags('Worldpay')
@Controller('worldpay')
export class WorldpayController {
  constructor(private readonly worldpayService: WorldpayService) {}

  @Post('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate Worldpay API Token' })
  @ApiResponse({ status: 200, description: 'Token successfully generated' })
  async generateToken() {
    const tokenData = await this.worldpayService.generateToken();
    return {
      success: true,
      message: 'Token generated successfully',
      data: tokenData,
    };
  }

  @Post('connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connect Business to Worldpay' })
  @ApiResponse({ status: 200, description: 'Business connected successfully' })
  async connectBusiness(
    @Req() req: RequestWithUser,
    @Body('businessId') businessId: string,
  ) {
    const userId = req.user.id;
    const business = await this.worldpayService.connectBusiness(
      businessId,
      userId,
    );

    return {
      success: true,
      message: 'Business connected to Worldpay successfully',
      data: {
        id: business.id,
        paymentProvider: business.paymentProvider,
        paymentProviderStatus: business.paymentProviderStatus,
      },
    };
  }

  @Get('kyc/link')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Worldpay KYC Link' })
  @ApiResponse({ status: 200, description: 'KYC link retrieved successfully' })
  async getKycLink(
    @Req() req: RequestWithUser,
    @Query('payerId') payerId: string,
  ) {
    const userId = req.user.id;
    const kycData = await this.worldpayService.getKycLink(payerId, userId);

    return {
      success: true,
      message: 'KYC link retrieved successfully',
      data: kycData,
    };
  }
}
