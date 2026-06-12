import { Injectable, Logger } from '@nestjs/common';
import * as yaml from 'js-yaml';
import { generateText } from 'ai';
import { AiProviderRouter } from '../../common/ai-provider-router.service';
import { ApiEndpointDef } from '../interfaces/api-fusion.interfaces';

@Injectable()
export class ApiSpecAnalyzerService {
  private readonly logger = new Logger(ApiSpecAnalyzerService.name);

  constructor(private readonly aiRouter: AiProviderRouter) {}

  async analyze(
    rawSpec: string,
    provider: string,
  ): Promise<{
    endpoints: ApiEndpointDef[];
    authScheme: 'oauth2' | 'api_key' | 'bearer' | 'basic';
    authConfig: object | null;
  }> {
    let specJson: any;

    // 1. Parse YAML or JSON
    try {
      specJson =
        typeof rawSpec === 'string' &&
        (rawSpec.trim().startsWith('{') || rawSpec.trim().startsWith('['))
          ? JSON.parse(rawSpec)
          : yaml.load(rawSpec);
    } catch (e) {
      this.logger.error(`Failed to parse spec for ${provider}: ${e.message}`);
      throw new Error(`Spec parsing failed: ${e.message}`);
    }

    // 2. Extract basic info from OpenAPI structure
    const endpoints: ApiEndpointDef[] = [];
    const paths = specJson.paths || {};

    for (const path of Object.keys(paths)) {
      for (const method of Object.keys(paths[path])) {
        const op = paths[path][method];
        endpoints.push({
          method: method.toUpperCase(),
          path,
          summary: op.summary || op.operationId || `${method} ${path}`,
          authRequired: !!(op.security || specJson.security),
          requestSchema: op.requestBody?.content?.['application/json']?.schema,
          responseSchema:
            op.responses?.['200']?.content?.['application/json']?.schema,
        });
      }
    }

    // 3. Gemini Gap Filling
    const enhanced = await this.fillGapsWithGemini(
      specJson,
      endpoints,
      provider,
    );

    return {
      endpoints: enhanced.endpoints,
      authScheme: enhanced.authScheme,
      authConfig: enhanced.authConfig,
    };
  }

  private async fillGapsWithGemini(
    specJson: any,
    endpoints: ApiEndpointDef[],
    provider: string,
  ) {
    const model = this.aiRouter.getModel('specialist');

    const system = `You are an API architecture expert. Your job is to analyze partial or messy API specifications and normalize them into a clean structure.
Identify the primary authentication scheme and fill in missing request/response schemas for key endpoints based on your internal knowledge of the provider: ${provider}.`;

    const prompt = `Raw spec snippet: ${JSON.stringify(specJson).substring(0, 5000)}
    
Current endpoints identified: ${JSON.stringify(endpoints)}

Return a JSON object:
{
  "authScheme": "oauth2" | "api_key" | "bearer" | "basic",
  "authConfig": { "authorize_url": "...", "token_url": "...", "scopes": ["..."] } | null,
  "endpoints": [ { "method": "...", "path": "...", "summary": "...", "requestSchema": { ... }, "responseSchema": { ... } } ]
}`;

    try {
      const { text } = await generateText({
        model,
        system,
        prompt,
      });

      const result = JSON.parse(text.replace(/```json|```/g, ''));
      return result;
    } catch (e) {
      this.logger.error(`Gemini gap filling failed: ${e.message}`);
      return { endpoints, authScheme: 'api_key' as const, authConfig: null };
    }
  }
}
