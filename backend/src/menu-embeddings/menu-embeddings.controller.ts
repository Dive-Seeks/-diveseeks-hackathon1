import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Query,
  HttpCode,
} from '@nestjs/common';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { MenuEmbeddingsService } from './menu-embeddings.service';
import { MenuEmbeddingsSeeder, SeedResult } from './menu-embeddings.seeder';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';

class SearchDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  sourceType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}

@ApiTags('menu-embeddings')
@Controller('menu-embeddings')
@UseGuards(JwtAuthGuard)
export class MenuEmbeddingsController {
  constructor(
    private readonly service: MenuEmbeddingsService,
    private readonly seeder: MenuEmbeddingsSeeder,
  ) {}

  @Post('search')
  @HttpCode(200)
  async search(@Body() body: SearchDto) {
    const { query, sourceType, limit = 20 } = body;
    const queryEmbedding = await this.service.embedText(query);
    const results = await this.service.similarDishes({
      queryEmbedding,
      tenantId: null,
      sourceType,
      limit,
      minSimilarity: 0.3,
    });
    return results;
  }

  @Post('seed')
  async seed(@Query('force') force?: string) {
    if (force === 'true') {
      return this.seeder.seed();
    }
    return this.seeder.seedIfNeeded();
  }

  @Get('count')
  async count(@Query('sourceType') sourceType?: string) {
    return { count: await this.service.countEmbeddings(sourceType) };
  }
}
