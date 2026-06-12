import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { SearchCompaniesQueryDto } from './dto/search-companies-query.dto';
import { CompanyPeopleQueryDto } from './dto/company-people-query.dto';

@Injectable()
export class CompaniesHouseService {
  private readonly logger = new Logger(CompaniesHouseService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Check multiple env key names for backwards compatibility
    this.baseUrl =
      this.configService.get<string>('COMPANY_HOUSE_API_URL') ||
      this.configService.get<string>('COMPANY_HOUSE_BASE_URL') ||
      'https://api.company-information.service.gov.uk';
  }

  async searchCompanies(query: SearchCompaniesQueryDto) {
    const isSandbox =
      String(this.configService.get('COMPANY_HOUSE_SANDBOX_MODE')) === 'true';
    if (isSandbox) {
      this.logger.log('Returning sandbox company search data');
      const mockCompanies = [
        {
          companyNumber: '07496944',
          companyName: 'GOOGLE UK LIMITED',
          companyStatus: 'active',
          companyType: 'ltd',
          dateOfCreation: '2011-01-20',
          addressSnippet:
            'Belgrave House, 76 Buckingham Palace Road, London, SW1W 9TQ',
        },
        {
          companyNumber: '12345678',
          companyName: 'TEST SANDBOX COMPANY LTD',
          companyStatus: 'active',
          companyType: 'ltd',
          dateOfCreation: '2023-01-01',
          addressSnippet: '123 Sandbox Lane, Test City, TS1 1AA',
        },
        {
          companyNumber: '87654321',
          companyName: 'DIVE SEEKS TECH LTD',
          companyStatus: 'active',
          companyType: 'ltd',
          dateOfCreation: '2020-05-15',
          addressSnippet: '45 Innovation Way, London, E1 4QE',
        },
      ];

      return {
        success: true,
        data: mockCompanies.filter((c) =>
          c.companyName.toLowerCase().includes(query.q.toLowerCase()),
        ),
        meta: { itemsPerPage: 10, startIndex: 0, totalResults: 3 },
      };
    }

    const itemsPerPage = query.itemsPerPage ?? 10;
    const startIndex = query.startIndex ?? 0;

    const data = await this.makeRequest<{
      items?: Array<{
        title?: string;
        company_number?: string;
        company_status?: string;
        company_type?: string;
        date_of_creation?: string;
        address_snippet?: string;
      }>;
      items_per_page?: number;
      start_index?: number;
      total_results?: number;
    }>('/search/companies', {
      q: query.q,
      items_per_page: itemsPerPage,
      start_index: startIndex,
    });

    return {
      success: true,
      data:
        data.items?.map((item) => ({
          companyNumber: item.company_number,
          companyName: item.title,
          companyStatus: item.company_status,
          companyType: item.company_type,
          dateOfCreation: item.date_of_creation,
          addressSnippet: item.address_snippet,
        })) ?? [],
      meta: {
        itemsPerPage: data.items_per_page ?? itemsPerPage,
        startIndex: data.start_index ?? startIndex,
        totalResults: data.total_results ?? 0,
      },
    };
  }

  async getCompanyPeople(companyNumber: string, query: CompanyPeopleQueryDto) {
    const isSandbox =
      String(this.configService.get('COMPANY_HOUSE_SANDBOX_MODE')) === 'true';
    if (isSandbox) {
      this.logger.log('Returning sandbox company people data');
      return {
        success: true,
        data: {
          company: {
            companyNumber,
            companyName:
              companyNumber === '07496944'
                ? 'GOOGLE UK LIMITED'
                : 'TEST SANDBOX COMPANY LTD',
            companyStatus: 'active',
            companyType: 'ltd',
            dateOfCreation: '2011-01-20',
            sicCodes: ['62012', '62020'],
            registeredOfficeAddress: {
              address_line_1: 'Belgrave House',
              address_line_2: '76 Buckingham Palace Road',
              locality: 'London',
              postal_code: 'SW1W 9TQ',
              country: 'United Kingdom',
            },
          },
          directors: [
            {
              name: 'SMITH, John Doe',
              role: 'director',
              appointedOn: '2015-10-02',
              nationality: 'British',
              occupation: 'Director',
              dateOfBirth: { year: 1980, month: 6 },
            },
          ],
          owners: [
            {
              name: 'HOLDINGS INC.',
              notifiedOn: '2016-04-06',
              naturesOfControl: ['ownership-of-shares-75-to-100-percent'],
            },
          ],
        },
      };
    }

    const officersLimit = query.officersLimit ?? 35;
    const ownersLimit = query.ownersLimit ?? 35;

    const [companyProfile, officers, owners] = await Promise.all([
      this.makeRequest<{
        company_number?: string;
        company_name?: string;
        company_status?: string;
        type?: string;
        date_of_creation?: string;
        sic_codes?: string[];
        registered_office_address?: Record<string, string>;
      }>(`/company/${companyNumber}`),
      this.makeRequest<{
        items?: Array<{
          name?: string;
          officer_role?: string;
          appointed_on?: string;
          resigned_on?: string;
          nationality?: string;
          occupation?: string;
          date_of_birth?: { year?: number; month?: number };
        }>;
      }>(`/company/${companyNumber}/officers`, {
        items_per_page: officersLimit,
      }),
      this.makeRequest<{
        items?: Array<{
          name?: string;
          ceased_on?: string;
          notified_on?: string;
          nationality?: string;
          natures_of_control?: string[];
          date_of_birth?: { year?: number; month?: number };
        }>;
      }>(`/company/${companyNumber}/persons-with-significant-control`, {
        items_per_page: ownersLimit,
      }),
    ]);

    return {
      success: true,
      data: {
        company: {
          companyNumber: companyProfile.company_number,
          companyName: companyProfile.company_name,
          companyStatus: companyProfile.company_status,
          companyType: companyProfile.type,
          dateOfCreation: companyProfile.date_of_creation,
          sicCodes: companyProfile.sic_codes ?? [],
          registeredOfficeAddress:
            companyProfile.registered_office_address ?? {},
        },
        directors:
          officers.items?.map((item) => ({
            name: item.name,
            role: item.officer_role,
            appointedOn: item.appointed_on,
            resignedOn: item.resigned_on,
            nationality: item.nationality,
            occupation: item.occupation,
            dateOfBirth: item.date_of_birth ?? null,
          })) ?? [],
        owners:
          owners.items?.map((item) => ({
            name: item.name,
            ceasedOn: item.ceased_on,
            notifiedOn: item.notified_on,
            nationality: item.nationality,
            naturesOfControl: item.natures_of_control ?? [],
            dateOfBirth: item.date_of_birth ?? null,
          })) ?? [],
      },
    };
  }

  async getComprehensiveCompanyInfo(companyName: string) {
    // 1. Search for the company
    const searchResult = await this.searchCompanies({
      q: companyName,
      itemsPerPage: 10,
      startIndex: 0,
    });

    if (
      !searchResult.success ||
      !searchResult.data ||
      searchResult.data.length === 0
    ) {
      throw new NotFoundException(
        `No company found matching name: ${companyName}`,
      );
    }

    // 2. Normalize function to handle name variations (e.g. "Ltd" vs "Limited", ignoring case and punctuation)
    const normalizeName = (name: string) => {
      return name
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
        .replace(/\s{2,}/g, ' ')
        .replace(/\b(ltd|limited)\b/g, 'ltd')
        .trim();
    };

    const targetNormalized = normalizeName(companyName);

    // 3. Find the best match
    // Priority 1: Exact match after normalization
    let bestMatch = searchResult.data.find(
      (c) => c.companyName && normalizeName(c.companyName) === targetNormalized,
    );

    // Priority 2: Contains the target name or target contains the company name
    if (!bestMatch) {
      bestMatch = searchResult.data.find((c) => {
        if (!c.companyName) return false;
        const normalizedC = normalizeName(c.companyName);
        return (
          normalizedC.includes(targetNormalized) ||
          targetNormalized.includes(normalizedC)
        );
      });
    }

    // Priority 3: Fallback to the first result if it's considered highly relevant
    if (!bestMatch) {
      bestMatch = searchResult.data[0];
    }

    if (!bestMatch || !bestMatch.companyNumber) {
      throw new NotFoundException(
        `Unable to accurately identify company details for: ${companyName}`,
      );
    }

    // 4. Retrieve comprehensive data (Profile, Officers, Owners)
    const peopleData = await this.getCompanyPeople(bestMatch.companyNumber, {
      officersLimit: 35,
      ownersLimit: 35,
    });

    return {
      success: true,
      message: `Successfully retrieved comprehensive data for ${bestMatch.companyName}`,
      data: peopleData.data,
    };
  }

  private async makeRequest<T>(
    path: string,
    params?: Record<string, string | number>,
  ): Promise<T> {
    const apiKey =
      this.configService.get<string>('COMPANY_HOUSE_API') ||
      this.configService.get<string>('COMPANIES_HOUSE_API_KEY');

    if (!apiKey) {
      this.logger.error(
        'Companies House API key is not configured. Set COMPANY_HOUSE_API in your .env file.',
      );
      throw new InternalServerErrorException(
        'Companies House API key is not configured. Please contact the administrator.',
      );
    }

    const auth = Buffer.from(`${apiKey}:`).toString('base64');

    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(`${this.baseUrl}${path}`, {
          headers: {
            Authorization: `Basic ${auth}`,
          },
          params,
        }),
      );

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: string }>;
      const status = axiosError.response?.status;
      const message =
        axiosError.response?.data?.error ||
        axiosError.message ||
        'Companies House request failed';

      this.logger.error(
        `Companies House request failed: ${path} (${status ?? 'unknown'}) ${message}`,
      );

      if (status === 401 || status === 403) {
        throw new BadGatewayException(
          'Companies House API authentication failed. The API key may be expired or invalid.',
        );
      }

      if (status === 404) {
        throw new NotFoundException(
          `No data found at Companies House for the requested resource.`,
        );
      }

      if (status === 429) {
        throw new BadGatewayException(
          'Companies House API rate limit exceeded. Please try again later.',
        );
      }

      throw new BadGatewayException(
        `Companies House API error (${status ?? 'unknown'}): ${message}`,
      );
    }
  }
}
