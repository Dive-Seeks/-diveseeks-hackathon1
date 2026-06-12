import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { ApiFusionBlueprint } from '../entities/api-fusion-blueprint.entity';
import { ApiFusionCredential } from '../entities/api-fusion-credential.entity';
import { ApiFusionExecution } from '../entities/api-fusion-execution.entity';
import { CredentialVaultService } from './credential-vault.service';

@Injectable()
export class ApiFusionExecutorService {
  private readonly logger = new Logger(ApiFusionExecutorService.name);

  constructor(
    @InjectRepository(ApiFusionBlueprint)
    private readonly blueprintRepo: Repository<ApiFusionBlueprint>,
    @InjectRepository(ApiFusionCredential)
    private readonly credentialRepo: Repository<ApiFusionCredential>,
    @InjectRepository(ApiFusionExecution)
    private readonly executionRepo: Repository<ApiFusionExecution>,
    private readonly vault: CredentialVaultService,
  ) {}

  async call(
    tenantId: string,
    provider: string,
    endpointStr: string, // 'GET /me'
    payload?: object,
    calledBy: 'specialist' | 'frontend' | 'cron' = 'specialist',
    mcpToolName?: string,
  ): Promise<{ status: number; body: object; durationMs: number }> {
    const startTime = Date.now();

    // 1. Load blueprint — tenant-specific first, then global fallback
    const blueprint = await this.blueprintRepo.findOne({
      where: [
        { provider, status: 'active', tenantId },
        { provider, status: 'active', tenantId: null as any, isGlobal: true },
      ],
    });

    if (!blueprint) {
      throw new Error(`Active blueprint not found for provider: ${provider}`);
    }

    // 2. Load and decrypt credentials
    const credential = await this.credentialRepo.findOne({
      where: { tenantId, blueprintId: blueprint.id },
    });

    if (!credential) {
      throw new Error(
        `Credentials not found for ${provider} (Tenant: ${tenantId})`,
      );
    }

    const decryptedCreds: any = this.vault.decrypt(
      tenantId,
      credential.encryptedCredentials,
    );

    // 3. Build request
    const [method, path] = endpointStr.split(' ');
    const url = path.startsWith('http')
      ? path
      : `${this.getBaseUrl(blueprint)}${path}`;

    const headers: any = {
      'Content-Type': 'application/json',
    };

    // Inject auth
    this.injectAuth(headers, blueprint, decryptedCreds);

    try {
      const response = await axios({
        method: method as any,
        url,
        data: payload,
        headers,
        timeout: 10000,
      });

      const duration = Date.now() - startTime;

      // 4. Log execution
      await this.executionRepo.save({
        tenantId,
        blueprintId: blueprint.id,
        calledBy,
        endpoint: endpointStr,
        mcpToolName,
        requestPayload: payload,
        responseStatus: response.status,
        responseBody: response.data,
        durationMs: duration,
      });

      // 5. Increment usage count and auto-promote to global if threshold reached
      await this.blueprintRepo.increment({ id: blueprint.id }, 'usageCount', 1);

      const updatedBlueprint = await this.blueprintRepo.findOne({
        where: { id: blueprint.id },
      });
      if (
        updatedBlueprint &&
        updatedBlueprint.usageCount >= 10 &&
        !updatedBlueprint.isGlobal
      ) {
        this.logger.log(
          `Promoting blueprint ${blueprint.id} (${blueprint.provider}) to global status (Usage: ${updatedBlueprint.usageCount})`,
        );
        await this.blueprintRepo.update(blueprint.id, { isGlobal: true });
      }

      return {
        status: response.status,
        body: response.data,
        durationMs: duration,
      };
    } catch (e) {
      const duration = Date.now() - startTime;
      const status = e.response?.status || 500;
      const body = e.response?.data || { error: e.message };

      await this.executionRepo.save({
        tenantId,
        blueprintId: blueprint.id,
        calledBy,
        endpoint: endpointStr,
        mcpToolName,
        requestPayload: payload,
        responseStatus: status,
        responseBody: body,
        durationMs: duration,
      });

      throw e;
    }
  }

  async findActive(
    tenantId: string,
    provider: string,
  ): Promise<ApiFusionBlueprint | null> {
    return this.blueprintRepo.findOne({
      where: [
        { provider, status: 'active', tenantId },
        { provider, status: 'active', tenantId: null as any, isGlobal: true },
      ],
    });
  }

  private getBaseUrl(blueprint: ApiFusionBlueprint): string {
    // This would typically come from the specRaw or a known provider config
    return (blueprint.specRaw as any)?.servers?.[0]?.url || '';
  }

  private injectAuth(headers: any, blueprint: ApiFusionBlueprint, creds: any) {
    switch (blueprint.authScheme) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${creds.accessToken || creds.token}`;
        break;
      case 'api_key':
        const headerName =
          (blueprint.authConfig as any)?.header_name || 'X-API-Key';
        headers[headerName] = creds.apiKey;
        break;
      case 'basic':
        const auth = Buffer.from(
          `${creds.username}:${creds.password}`,
        ).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
        break;
      case 'oauth2':
        headers['Authorization'] = `Bearer ${creds.accessToken}`;
        break;
    }
  }
}
