import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiIntegrationService } from './ai-integration.service';
import { MenuGeneratorService } from './services/menu-generator.service';
import { SaveAiConfigDto, TestApiKeyDto } from './dto/ai-integration.dto';
import { AiContext, AiProvider } from './entities/ai-configuration.entity';
import { UIMessage } from 'ai';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    tenantId?: string;
    storeId?: string;
    role?: string;
  };
}

interface ChatBody {
  messages: UIMessage[];
}

interface MenuGenerationBody {
  businessType: 'RESTAURANT' | 'RETAIL' | 'CAFE' | 'BAR' | 'HYBRID';
  businessName: string;
  keywords: string[];
  dietaryNeeds?: string[];
}

@ApiTags('AI Integration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai-integration')
export class AiIntegrationController {
  constructor(
    private readonly aiIntegrationService: AiIntegrationService,
    private readonly menuGeneratorService: MenuGeneratorService,
  ) {}

  @Post('config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save or update AI API keys for the current user' })
  @ApiQuery({ name: 'context', enum: ['pos', 'coding'], required: false })
  @ApiResponse({ status: 200, description: 'Configuration saved' })
  saveConfig(
    @Req() req: RequestWithUser,
    @Body() dto: SaveAiConfigDto,
    @Query('context') context?: AiContext,
  ) {
    return this.aiIntegrationService.saveConfig(
      req.user.userId,
      dto,
      context ?? dto.context ?? 'pos',
    );
  }

  @Post('test-key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test an API key against the provider — returns { success, message }' })
  testKey(
    @Req() _req: RequestWithUser,
    @Body() dto: TestApiKeyDto,
  ) {
    return this.aiIntegrationService.testApiKey(dto.provider, dto.apiKey);
  }

  @Get('all-models')
  @ApiOperation({ summary: 'All models from all providers — OpenRouter public catalog, cached 1h, no key needed' })
  async getAllModels(@Req() _req: RequestWithUser) {
    const models = await this.aiIntegrationService.getAllModels();
    return { models };
  }

  @Get('models')
  @ApiOperation({ summary: 'Fetch available models from a provider using stored API key' })
  @ApiQuery({ name: 'provider', enum: ['openai', 'groq', 'openrouter', 'google', 'deepseek'], required: true })
  @ApiQuery({ name: 'context', enum: ['pos', 'coding'], required: false })
  async getModels(
    @Req() req: RequestWithUser,
    @Query('provider') provider: string,
    @Query('context') context?: string,
  ) {
    const validProviders = ['openai', 'groq', 'openrouter', 'google', 'deepseek'];
    if (!validProviders.includes(provider)) {
      throw new BadRequestException('Invalid provider');
    }
    const models = await this.aiIntegrationService.getProviderModels(
      req.user.userId,
      provider as AiProvider,
      (context as any) ?? 'pos',
    );
    return { models };
  }

  @Post('test-model')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a real token to the active model — returns { success, latencyMs, message }' })
  @ApiQuery({ name: 'context', enum: ['pos', 'coding'], required: false })
  testModel(
    @Req() req: RequestWithUser,
    @Query('context') context?: AiContext,
  ) {
    return this.aiIntegrationService.testModel(req.user.userId, context ?? 'coding');
  }

  @Get('config')
  @ApiOperation({ summary: 'Check if AI is configured for the current user' })
  @ApiQuery({ name: 'context', enum: ['pos', 'coding'], required: false })
  getConfig(
    @Req() req: RequestWithUser,
    @Query('context') context?: AiContext,
  ) {
    return this.aiIntegrationService.getConfig(
      req.user.userId,
      context ?? 'pos',
    );
  }

  @Post('chat/general')
  @ApiOperation({ summary: 'General AI assistant chat (streaming)' })
  async chatGeneral(
    @Req() req: RequestWithUser,
    @Body() body: ChatBody,
    @Res() res: Response,
  ) {
    await this.aiIntegrationService.streamChat(
      body.messages,
      req.user.userId,
      'general',
      res,
    );
  }

  @Post('chat/marketing')
  @ApiOperation({
    summary: 'Marketing AI — website builder, ads, marketing pages (streaming)',
  })
  async chatMarketing(
    @Req() req: RequestWithUser,
    @Body() body: ChatBody,
    @Res() res: Response,
  ) {
    await this.aiIntegrationService.streamChat(
      body.messages,
      req.user.userId,
      'marketing',
      res,
    );
  }

  @Post('chat/analytics')
  @ApiOperation({
    summary: 'Store Performance AI — analyze sales, trends (streaming)',
  })
  async chatAnalytics(
    @Req() req: RequestWithUser,
    @Body() body: ChatBody,
    @Res() res: Response,
  ) {
    await this.aiIntegrationService.streamChat(
      body.messages,
      req.user.userId,
      'analytics',
      res,
    );
  }

  @Post('menu/generate')
  @ApiOperation({
    summary:
      'Generate menu using 3-tier system (DB Template → Redis Cache → AI Generation)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Menu generated successfully. Source indicated in meta.source field.',
  })
  @ApiResponse({ status: 404, description: 'AI not configured' })
  @ApiResponse({
    status: 400,
    description: 'Budget exceeded or invalid request',
  })
  async generateMenu(
    @Req() req: RequestWithUser,
    @Body() body: MenuGenerationBody,
    @Res() res: Response,
  ) {
    const tenantId = req.user.tenantId || req.user.userId;

    await this.menuGeneratorService.generateMenu(
      {
        businessType: body.businessType,
        businessName: body.businessName,
        keywords: body.keywords,
        dietaryNeeds: body.dietaryNeeds,
      },
      tenantId,
      res,
    );
  }
}
