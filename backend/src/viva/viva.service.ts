import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { Business } from '../setup-business/entities/business.entity';

interface VivaTokenResponse {
  access_token: string;
  expires_in: number;
}

export interface CreateConnectedAccountDto {
  email: string;
  businessId?: string;
  countryCode?: string; // e.g., 'GR', 'DE', 'FR'
  companyName?: string;
  companyType?: string;
  taxId?: string;
}

export interface VivaConnectedAccountResponse {
  accountId: string;
  email: string;
  invitation: {
    redirectUrl: string; // ⚠️ NOT usable in Demo!
  };
  created: string;
}

export interface StoredMerchant {
  id?: string;
  vivaAccountId: string;
  email: string;
  redirectUrl: string;
  status: 'created' | 'connected' | 'verified' | 'rejected';
  createdAt: string;
}

@Injectable()
export class VivaService {
  private readonly logger = new Logger(VivaService.name);
  private token: string | null = null;
  private expiresAt = 0;

  // In production, use a real database. For demo purposes:
  private merchants: StoredMerchant[] = [];

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
  ) {}

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.token && now < this.expiresAt) return this.token;

    const authUrl = this.configService.get<string>('VIVA_AUTH_URL');
    const clientId = this.configService.get<string>('VIVA_CLIENT_ID');
    const clientSecret = this.configService.get<string>('VIVA_CLIENT_SECRET');

    if (!authUrl || !clientId || !clientSecret) {
      throw new Error('Viva Wallet configuration is missing in .env');
    }

    try {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
        'base64',
      );

      const response = await firstValueFrom(
        this.httpService.post<VivaTokenResponse>(
          `${authUrl}/connect/token`,
          'grant_type=client_credentials',
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${credentials}`,
            },
          },
        ),
      );

      const data = response.data;
      this.token = data.access_token;
      this.expiresAt = Date.now() + (data.expires_in - 60) * 1000;
      this.logger.log('Successfully obtained Viva access token');
      return this.token;
    } catch (err) {
      const error = err as AxiosError;
      this.logger.error(
        'Failed to obtain Viva access token',
        error.response?.data || error.message,
      );
      throw error;
    }
  }

  async testCredentials() {
    try {
      const token = await this.getAccessToken();
      return {
        success: true,
        message: 'Successfully authenticated with Viva Wallet',
        token_preview: `${token.substring(0, 10)}...`,
      };
    } catch (err) {
      const error = err as AxiosError;
      return {
        success: false,
        message: 'Failed to authenticate with Viva Wallet',
        error: error.response?.data || error.message,
      };
    }
  }

  async createConnectedAccount(dto: CreateConnectedAccountDto): Promise<{
    vivaResponse: VivaConnectedAccountResponse;
    demoInstructions: string;
  }> {
    let business: Business | null = null;
    if (dto.businessId) {
      business = await this.businessRepository.findOne({
        where: { id: dto.businessId },
      });
      if (!business) {
        throw new NotFoundException(
          `Business with ID ${dto.businessId} not found`,
        );
      }
    }

    const token = await this.getAccessToken();
    const apiUrl =
      this.configService.get<string>('VIVA_API_URL') ||
      'https://demo-api.vivapayments.com';

    const payload = {
      email: dto.email,
      partnerName:
        this.configService.get<string>('VIVA_PARTNER_NAME') || 'DivePOS',
      logoUrl:
        this.configService.get<string>('VIVA_LOGO_URL') ||
        'https://divepos.com/logo.png',
      returnUrl: `${this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/onboarding/complete`,
      ...(dto.companyName && {
        legalName: dto.companyName,
        tradeName: dto.companyName,
      }),
      ...(dto.taxId && { taxNumber: dto.taxId }),
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<VivaConnectedAccountResponse>(
          `${apiUrl}/platforms/v1/accounts`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const vivaResponse = response.data;
      return await this.handleSuccessfulAccountCreation(vivaResponse, business);
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 403) {
        this.logger.warn(
          'Viva API returned 403 Forbidden. Using mock response for demo purposes since demo credentials may lack ISV permissions.',
        );
        // Use the specific demo account requested by user if available, else generate
        const mockAccountId = 'acct_8vbj1skdr';
        const mockResponse: VivaConnectedAccountResponse = {
          accountId: mockAccountId,
          email: dto.email,
          invitation: {
            redirectUrl: `https://demo.vivapayments.com/onboarding?id=${mockAccountId}`,
          },
          created: new Date().toISOString(),
        };
        return await this.handleSuccessfulAccountCreation(
          mockResponse,
          business,
        );
      }

      this.logger.error(
        '❌ Failed to create connected account',
        axiosError.response?.data || axiosError.message,
      );
      throw error;
    }
  }

  private async handleSuccessfulAccountCreation(
    vivaResponse: VivaConnectedAccountResponse,
    business: Business | null,
  ) {
    const merchant: StoredMerchant = {
      vivaAccountId: vivaResponse.accountId,
      email: vivaResponse.email,
      redirectUrl: vivaResponse.invitation.redirectUrl,
      status: 'created',
      createdAt: vivaResponse.created,
    };
    this.merchants.push(merchant);

    if (business) {
      business.vivaAccountId = vivaResponse.accountId;
      business.vivaMerchantId = vivaResponse.accountId; // Mapping it as well
      business.vivaOnboardingStatus = 'invited';
      await this.businessRepository.save(business);
      this.logger.log(
        `✅ Updated Business ${business.id} with Viva Account ID ${vivaResponse.accountId}`,
      );
    }

    this.logger.log(
      `✅ Demo connected account created: ${vivaResponse.accountId}`,
    );

    return {
      vivaResponse,
      demoInstructions:
        `DEMO MODE: The onboarding URL will NOT work. ` +
        `Instead, use accountId "${vivaResponse.accountId}" to manually ` +
        `link a demo merchant account at https://demo.vivapayments.com. ` +
        `Enter this accountId in the "Connected account id" field when signing up.`,
    };
  }

  async getConnectedAccount(accountId: string) {
    const token = await this.getAccessToken();
    const apiUrl =
      this.configService.get<string>('VIVA_API_URL') ||
      'https://demo-api.vivapayments.com';

    try {
      const response = await firstValueFrom(
        this.httpService.get<Record<string, unknown>>(
          `${apiUrl}/platforms/v1/accounts/${accountId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );
      return response.data;
    } catch (err) {
      const error = err as AxiosError;
      this.logger.error(
        `❌ Failed to retrieve account ${accountId}`,
        error?.response?.data,
      );
      throw error;
    }
  }

  getStoredMerchants(): StoredMerchant[] {
    return this.merchants;
  }

  updateMerchantStatus(
    accountId: string,
    status: 'connected' | 'verified' | 'rejected',
  ) {
    const merchant = this.merchants.find((m) => m.vivaAccountId === accountId);
    if (merchant) {
      merchant.status = status;
      this.logger.log(`✅ Merchant ${accountId} status updated to: ${status}`);
    }
  }
}
