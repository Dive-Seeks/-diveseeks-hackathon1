import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StoreImagesService } from './store-images.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetStoreImagesDto } from './dto/get-store-images.dto';
import { UploadImageDto } from './dto/upload-image.dto';
import { AssignImageDto } from './dto/assign-image.dto';

@ApiTags('Store Images')
@Controller('stores/:storeId/images')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StoreImagesController {
  constructor(private readonly storeImagesService: StoreImagesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an image to store gallery' })
  async uploadImage(
    @Param('storeId') storeId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() uploadDto: UploadImageDto,
    @Request() req,
  ) {
    const tenantId = req.user.tenantId;
    return await this.storeImagesService.uploadImage(
      file,
      tenantId,
      storeId,
      uploadDto.tags,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all images for a store' })
  async getStoreImages(
    @Param('storeId') storeId: string,
    @Query() query: GetStoreImagesDto,
    @Request() req,
  ) {
    const tenantId = req.user.tenantId;
    return await this.storeImagesService.findByStore(storeId, tenantId, query);
  }

  @Get('critical')
  @ApiOperation({ summary: 'Get critical images (most used) for prefetching' })
  async getCriticalImages(@Param('storeId') storeId: string, @Request() req) {
    const tenantId = req.user.tenantId;
    const images = await this.storeImagesService.getCriticalImages(
      storeId,
      tenantId,
    );
    return { images };
  }

  @Get(':imageId')
  @ApiOperation({ summary: 'Get a single image' })
  async getImage(@Param('imageId') imageId: string, @Request() req) {
    const tenantId = req.user.tenantId;
    return await this.storeImagesService.findOne(imageId, tenantId);
  }

  @Delete(':imageId')
  @ApiOperation({ summary: 'Delete an image' })
  async deleteImage(@Param('imageId') imageId: string, @Request() req) {
    const tenantId = req.user.tenantId;
    await this.storeImagesService.delete(imageId, tenantId);
    return { success: true, message: 'Image deleted successfully' };
  }

  @Patch(':imageId/assign')
  @ApiOperation({
    summary: 'Assign an image to a product, category, or menu item',
  })
  async assignImage(
    @Param('imageId') imageId: string,
    @Body() assignDto: AssignImageDto,
    @Request() req,
  ) {
    const tenantId = req.user.tenantId;
    return await this.storeImagesService.assignImage(
      imageId,
      tenantId,
      assignDto,
    );
  }
}
