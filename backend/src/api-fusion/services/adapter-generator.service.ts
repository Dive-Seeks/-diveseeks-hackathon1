import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateObject } from 'ai';
import { z } from 'zod';
import {
  ApiEndpointDef,
  ApiTestPlan,
} from '../interfaces/api-fusion.interfaces';
import { ApiFusionMcpBridgeService } from './api-fusion-mcp-bridge.service';
import { AI_TASKS } from '../../common/ai-models.constants';
import { AiProviderRouter } from '../../common/ai-provider-router.service';

@Injectable()
export class AdapterGeneratorService {
  private readonly logger = new Logger(AdapterGeneratorService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly mcpBridge: ApiFusionMcpBridgeService,
    private readonly aiRouter: AiProviderRouter,
  ) {}

  async generate(
    endpoints: ApiEndpointDef[],
    authScheme: string,
    provider: string,
  ): Promise<{
    endpoints: ApiEndpointDef[];
    mcpToolSchemas: any[];
  }> {
    const testPlanSchema = z.object({
      plans: z.array(
        z.object({
          method: z.string(),
          path: z.string(),
          exampleRequest: z.record(z.string(), z.any()),
          exampleResponse: z.record(z.string(), z.any()),
          testStrategy: z.string(),
          edgeCases: z.array(z.string()),
        }),
      ),
    });

    try {
      const { object } = await generateObject({
        model: this.aiRouter.getModel(AI_TASKS.FAST),
        schema: testPlanSchema,
        prompt: `Generate a detailed test plan for the following API endpoints of ${provider}. 
        Authentication scheme is ${authScheme}.
        
        Endpoints: ${JSON.stringify(endpoints)}`,
      });

      const updatedEndpoints = endpoints.map((e) => {
        const plan = object.plans.find(
          (p) => p.method === e.method && p.path === e.path,
        );
        return {
          ...e,
          testPlan: plan as ApiTestPlan,
        };
      });

      // Generate MCP tool schemas using the bridge service
      const mcpToolSchemas = this.mcpBridge.generateToolSchemas({
        provider,
        endpoints: updatedEndpoints,
      } as any);

      return {
        endpoints: updatedEndpoints,
        mcpToolSchemas,
      };
    } catch (e) {
      this.logger.error(`Failed to generate adapter: ${e.message}`);
      throw e;
    }
  }
}
