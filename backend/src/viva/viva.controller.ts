import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { VivaService, CreateConnectedAccountDto } from './viva.service';

@ApiTags('viva')
@Controller('viva')
export class VivaController {
  private readonly logger = new Logger(VivaController.name);

  constructor(private vivaService: VivaService) {}

  @Post('onboarding/create-account')
  @ApiOperation({ summary: 'Create a Viva connected account (Demo)' })
  @ApiResponse({
    status: 201,
    description: 'Connected account created successfully.',
  })
  async createAccount(@Body() dto: CreateConnectedAccountDto) {
    if (!dto.email) {
      throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const result = await this.vivaService.createConnectedAccount(dto);

      return {
        success: true,
        data: {
          accountId: result.vivaResponse.accountId,
          email: result.vivaResponse.email,
          onboardingUrl: result.vivaResponse.invitation.redirectUrl,
          created: result.vivaResponse.created,
        },
        demo: {
          warning: 'The onboarding URL does NOT work in demo environment.',
          instructions: result.demoInstructions,
          manualSteps: [
            '1. Copy the accountId from this response',
            '2. Go to https://demo.vivapayments.com and sign up for a new demo merchant account',
            '3. During signup, paste the accountId in the "Connected account id" field',
            '4. Complete the demo merchant registration',
            '5. Use 2FA code: 111111 when prompted',
            '6. The accounts will be linked and you will receive the Account Connected webhook',
          ],
        },
      };
    } catch (error) {
      this.logger.error('Create account failed', error?.response?.data);
      throw new HttpException(
        error?.response?.data?.message || 'Failed to create connected account',
        error?.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('onboarding/account/:accountId')
  @ApiOperation({ summary: 'Get a Viva connected account' })
  async getAccount(@Param('accountId') accountId: string) {
    try {
      const account = await this.vivaService.getConnectedAccount(accountId);
      return {
        success: true,
        data: account,
      };
    } catch (error) {
      throw new HttpException(
        error?.response?.data?.message || 'Account not found',
        error?.response?.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  @Get('onboarding/merchants')
  @ApiOperation({ summary: 'List demo stored merchants' })
  getMerchants() {
    return {
      success: true,
      data: this.vivaService.getStoredMerchants(),
    };
  }

  @Get('webhooks')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify Viva Webhook' })
  verifyWebhook() {
    const verificationKey = process.env.VIVA_WEBHOOK_KEY || '';
    return { Key: verificationKey };
  }

  @Post('webhooks')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Viva Webhook' })
  async handleWebhook(@Body() payload: Record<string, unknown>) {
    const EventTypeId = payload.EventTypeId as number;
    const EventData = payload.EventData as Record<string, any>;
    this.logger.log(`📩 Webhook received — EventTypeId: ${EventTypeId}`);

    switch (EventTypeId) {
      case 8193:
        this.logger.log('🔗 Account Connected webhook');
        this.vivaService.updateMerchantStatus(
          EventData.ConnectedAccountId,
          'connected',
        );
        break;
      case 8194:
        this.logger.log('✅ Account Verification Status Changed webhook');
        if (EventData.VerificationStatus === 'Verified') {
          this.vivaService.updateMerchantStatus(
            EventData.ConnectedAccountId,
            'verified',
          );
        } else if (EventData.VerificationStatus === 'Rejected') {
          this.vivaService.updateMerchantStatus(
            EventData.ConnectedAccountId,
            'rejected',
          );
        }
        break;
      case 1796:
        this.logger.log('💰 Transaction Payment Created webhook');
        break;
      case 1798:
        this.logger.log('❌ Transaction Failed webhook');
        break;
      default:
        this.logger.warn(`⚠️ Unknown EventTypeId: ${EventTypeId}`);
    }

    return { status: 'ok' };
  }
}
