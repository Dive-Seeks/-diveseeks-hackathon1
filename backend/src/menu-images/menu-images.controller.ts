import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Body,
  Request,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { MenuImagesService } from './menu-images.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GenerateImageDto } from './dto/generate-image.dto';
import { SearchImagesDto } from './dto/search-images.dto';

@ApiTags('Menu Images')
@Controller('menu-images')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MenuImagesController {
  constructor(private readonly menuImagesService: MenuImagesService) {}

  @Post('generate')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'sourceImage', maxCount: 1 },
      { name: 'styleRefImage', maxCount: 1 },
    ]),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Queue a new AI image generation job' })
  async generate(
    @Body() dto: GenerateImageDto,
    @UploadedFiles()
    files: {
      sourceImage?: Express.Multer.File[];
      styleRefImage?: Express.Multer.File[];
    },
    @Request() req,
  ) {
    const tenantId = req.user.tenantId;
    const sourceImage = files?.sourceImage?.[0];
    const styleRefImage = files?.styleRefImage?.[0];

    return await this.menuImagesService.generate(
      dto,
      tenantId,
      sourceImage,
      styleRefImage,
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search existing images by vector similarity' })
  async search(@Query() query: SearchImagesDto, @Request() req) {
    const tenantId = req.user.tenantId;
    return await this.menuImagesService.search(query, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'List tenant approved images' })
  async list(
    @Request() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const tenantId = req.user.tenantId;
    return await this.menuImagesService.listAll(tenantId, page, limit);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get generation job status' })
  async getStatus(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    return await this.menuImagesService.getStatus(id, tenantId);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a generated image' })
  async approve(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId || req.user.id;
    return await this.menuImagesService.approve(id, tenantId, userId);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a generated image' })
  async reject(@Param('id') id: string, @Request() req) {
    const tenantId = req.user.tenantId;
    return await this.menuImagesService.reject(id, tenantId);
  }
}
