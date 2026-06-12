import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FtpService } from './ftp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import * as path from 'path';
import * as fs from 'fs';

interface UploadedFile {
  originalname: string;
  buffer: Buffer;
}

@ApiTags('FTP')
@Controller('ftp')
@UseGuards(JwtAuthGuard)
export class FtpController {
  constructor(private readonly ftpService: FtpService) {}

  @Post('upload-from-folder')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Upload all files from the backend/uploads folder to the FTP server',
  })
  @ApiResponse({ status: 200, description: 'Files uploaded successfully' })
  async uploadFromFolder() {
    return await this.ftpService.uploadFromUploadsFolder();
  }

  @Get('list/:businessId/:storeId/:type')
  @ApiOperation({ summary: 'List files in a tenant/store directory' })
  async listFiles(
    @Param('businessId') businessId: string,
    @Param('storeId') storeId: string,
    @Param('type') type: string,
  ) {
    const sId = storeId === 'null' ? null : storeId;
    return await this.ftpService.listTenantFiles(businessId, sId, type);
  }

  @Delete('delete/:businessId/:storeId/:type/:fileName')
  @ApiOperation({ summary: 'Delete a file from a tenant/store directory' })
  async deleteFile(
    @Param('businessId') businessId: string,
    @Param('storeId') storeId: string,
    @Param('type') type: string,
    @Param('fileName') fileName: string,
  ) {
    const sId = storeId === 'null' ? null : storeId;
    return await this.ftpService.deleteTenantFile(
      businessId,
      sId,
      type,
      fileName,
    );
  }

  @Post('upload/:businessId/:storeId/:type')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file to a tenant/store directory' })
  async uploadFile(
    @Param('businessId') businessId: string,
    @Param('storeId') storeId: string,
    @Param('type')
    type:
      | 'branding'
      | 'verification'
      | 'reports'
      | 'banners'
      | 'menus'
      | 'gallery',
    @UploadedFile() file: UploadedFile,
  ) {
    const sId = storeId === 'null' ? null : storeId;
    const { originalname, buffer } = file;

    // Save file locally for upload (as required by basic-ftp uploadFrom)
    const tempPath = path.join(process.cwd(), 'uploads', originalname);
    fs.writeFileSync(tempPath, buffer);

    const result = await this.ftpService.uploadTenantFile(
      tempPath,
      originalname,
      businessId,
      sId,
      type,
    );
    return result;
  }
}
