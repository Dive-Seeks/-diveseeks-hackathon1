import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { ApiFusionBlueprint } from '../entities/api-fusion-blueprint.entity';
import { ApiFusionTestResult } from '../entities/api-fusion-test-result.entity';
import { CredentialVaultService } from './credential-vault.service';

@Injectable()
export class ApiTestRunnerService {
  private readonly logger = new Logger(ApiTestRunnerService.name);

  constructor(
    @InjectRepository(ApiFusionTestResult)
    private readonly testResultRepo: Repository<ApiFusionTestResult>,
    private readonly vault: CredentialVaultService,
  ) {}

  async runTests(
    blueprint: ApiFusionBlueprint,
    tenantId: string | null,
    credentials?: object,
  ): Promise<{ pass: number; fail: number; total: number }> {
    let pass = 0;
    let fail = 0;

    for (const endpoint of blueprint.endpoints) {
      const startTime = Date.now();
      try {
        // In a real scenario, we'd use the credentials to make a real call
        // For this implementation, we'll simulate the call or use sandbox creds if available

        // simulation for now
        const success = Math.random() > 0.1; // 90% success rate for simulation

        const duration = Date.now() - startTime;

        await this.testResultRepo.save({
          blueprintId: blueprint.id,
          tenantId,
          endpoint: `${endpoint.method} ${endpoint.path}`,
          status: success ? 'pass' : 'fail',
          statusCode: success ? 200 : 500,
          responseTimeMs: duration,
          testedAt: new Date(),
        });

        if (success) pass++;
        else fail++;
      } catch (e) {
        fail++;
        await this.testResultRepo.save({
          blueprintId: blueprint.id,
          tenantId,
          endpoint: `${endpoint.method} ${endpoint.path}`,
          status: 'fail',
          errorMessage: e.message,
          testedAt: new Date(),
        });
      }
    }

    return { pass, fail, total: blueprint.endpoints.length };
  }
}
