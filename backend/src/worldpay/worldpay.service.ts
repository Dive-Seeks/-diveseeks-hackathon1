import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import {
  Business,
  BusinessStatus,
} from '../setup-business/entities/business.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class WorldpayService {
  private readonly logger = new Logger(WorldpayService.name);
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(Business)
    private readonly businessRepository: Repository<Business>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async generateToken(): Promise<{
    access_token: string;
    expires_in: number;
    token_type: string;
  }> {
    const authUrl = this.configService.get<string>('WORLDPAY_AUTH_URL');
    const username = this.configService.get<string>('WORLDPAY_API_USERNAME');
    const password = this.configService.get<string>('WORLDPAY_API_USERKEY');

    if (!authUrl || !username || !password) {
      this.logger.error('Worldpay configuration is missing.');
      throw new InternalServerErrorException(
        'Payment gateway configuration error.',
      );
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${authUrl}/login`, {
          Username: username,
          Password: password,
        }),
      );

      const data = response.data;

      if (data && data.access_token) {
        this.token = data.access_token;
        // The token expires_in is in seconds
        this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000); // 1 min buffer

        this.logger.log('Successfully generated Worldpay access token.');
        return data;
      }

      throw new InternalServerErrorException(
        'Failed to retrieve access token from Worldpay.',
      );
    } catch (error) {
      this.logger.error(
        'Error generating Worldpay token',
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException(
        'Error communicating with payment gateway.',
      );
    }
  }

  async getValidToken(): Promise<string> {
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token;
    }

    const data = await this.generateToken();
    return data.access_token;
  }

  async connectBusiness(businessId: string, userId: string): Promise<Business> {
    const business = await this.businessRepository.findOne({
      where: { id: businessId, userId },
    });
    if (!business) {
      throw new NotFoundException(`Business with ID ${businessId} not found`);
    }

    if (
      business.status !== BusinessStatus.ACTIVE &&
      business.status !== BusinessStatus.SUBMITTED
    ) {
      throw new BadRequestException(
        'Business must be ACTIVE or SUBMITTED to connect to Worldpay',
      );
    }

    // Verify we can get a valid token (simulate connection to gateway)
    await this.getValidToken();

    business.paymentProvider = 'worldpay';
    business.paymentProviderStatus = 'connected';

    return this.businessRepository.save(business);
  }

  async getKycLink(
    payerId: string,
    userId: string,
  ): Promise<{ url: string; expiresAt: string; status: string }> {
    // Note: Worldpay typically issues hosted KYC links via account management or a separate risk/compliance API
    // This is a placeholder/stub to be implemented when Worldpay provides the API details.

    // In a real implementation, we would call Worldpay API here
    // const token = await this.getValidToken();
    // const response = await this.httpService.post(..., { headers: { Authorization: `Bearer ${token}` }});

    this.logger.log(`Generated KYC link for payer ${payerId}`);

    // Mock response
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

    return {
      url: `https://hosted.worldpay.com/kyc/upload?session=${payerId}_mock_session`,
      expiresAt: expiresAt.toISOString(),
      status: 'pending',
    };
  }
}
