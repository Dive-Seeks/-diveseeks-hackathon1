import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ftp from 'basic-ftp';
import * as path from 'path';
import * as fs from 'fs';

export interface FtpUploadResult {
  success: boolean;
  path: string;
  url: string;
}

@Injectable()
export class FtpService implements OnModuleInit {
  private readonly logger = new Logger(FtpService.name);
  private readonly uploadsPath = path.join(process.cwd(), 'uploads');

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsPath)) {
      fs.mkdirSync(this.uploadsPath, { recursive: true });
    }
  }

  private getFtpConfig() {
    const config = {
      host: this.configService.get<string>('FTP_Server'),
      user: this.configService.get<string>('FTP_Username'),
      password: this.configService.get<string>('FTP_Password'),
      port: this.configService.get<number>('FTP_Explicit_FTPS_Port', 21),
      secure: true,
      secureOptions: {
        rejectUnauthorized: false, // Often needed for shared hosting FTP
      },
    };
    this.logger.log(
      `FTP Config - Host: ${config.host}, User: ${config.user}, Port: ${config.port}`,
    );
    return config;
  }

  /**
   * Uploads a file to a specific tenant and store directory.
   * Path format: /tenants/{businessId}/stores/{storeId}/{type}/{fileName}
   */
  async uploadTenantFile(
    localPath: string,
    fileName: string,
    businessId: string,
    storeId: string | null,
    type:
      | 'branding'
      | 'verification'
      | 'reports'
      | 'banners'
      | 'menus'
      | 'gallery',
  ): Promise<FtpUploadResult> {
    const client = new ftp.Client();
    try {
      await client.access(this.getFtpConfig());

      // Construct remote directory path
      // e.g., /public_html/tenants/uuid-business/stores/uuid-site/branding/
      // or /public_html/tenants/uuid-business/verification/ (if storeId is null)
      let remoteDir = `/public_html/tenants/${businessId}`;
      if (storeId) {
        remoteDir += `/stores/${storeId}/${type}`;
      } else {
        remoteDir += `/${type}`;
      }

      this.logger.log(`Ensuring remote directory: ${remoteDir}`);
      await client.ensureDir(remoteDir);

      this.logger.log(`Uploading file to: ${remoteDir}/${fileName}`);
      await client.uploadFrom(localPath, fileName);

      const publicUrl = this.configService
        .get<string>('FTP_Public_URL', '')
        .replace(/\/+$/, '');
      const publicPath = remoteDir.replace('/public_html', '');
      const finalUrl = `${publicUrl}${publicPath}/${fileName}`;

      this.logger.log(`Generated Public URL: ${finalUrl}`);

      return {
        success: true,
        path: `${remoteDir}/${fileName}`,
        url: finalUrl,
      };
    } catch (err) {
      this.logger.error(`Failed to upload tenant file ${fileName}:`, err);
      throw err;
    } finally {
      client.close();
    }
  }

  /**
   * Uploads multiple files to a specific tenant and store directory in a single session.
   */
  async uploadTenantFiles(
    files: { localPath: string; fileName: string }[],
    businessId: string,
    storeId: string | null,
    type:
      | 'branding'
      | 'verification'
      | 'reports'
      | 'banners'
      | 'menus'
      | 'gallery',
  ): Promise<FtpUploadResult[]> {
    const client = new ftp.Client();
    try {
      await client.access(this.getFtpConfig());

      let remoteDir = `/public_html/tenants/${businessId}`;
      if (storeId) {
        remoteDir += `/stores/${storeId}/${type}`;
      } else {
        remoteDir += `/${type}`;
      }

      this.logger.log(`Ensuring remote directory: ${remoteDir}`);
      await client.ensureDir(remoteDir);

      const results: FtpUploadResult[] = [];
      for (const file of files) {
        this.logger.log(`Uploading file to: ${remoteDir}/${file.fileName}`);
        await client.uploadFrom(file.localPath, file.fileName);
        const publicUrl = this.configService
          .get<string>('FTP_Public_URL', '')
          .replace(/\/+$/, '');
        // The public URL shouldn't include /public_html
        const publicPath = remoteDir.replace('/public_html', '');
        const finalUrl = `${publicUrl}${publicPath}/${file.fileName}`;

        this.logger.log(
          `Generated Public URL for multiple upload: ${finalUrl}`,
        );

        results.push({
          success: true,
          path: `${remoteDir}/${file.fileName}`,
          url: finalUrl,
        });
      }

      return results;
    } catch (err) {
      this.logger.error(`Failed to upload multiple tenant files:`, err);
      throw err;
    } finally {
      client.close();
    }
  }

  /**
   * Deletes a file from the FTP server.
   */
  async deleteTenantFile(
    businessId: string,
    storeId: string | null,
    type: string,
    fileName: string,
  ) {
    const client = new ftp.Client();
    try {
      await client.access(this.getFtpConfig());
      let remotePath = `/public_html/tenants/${businessId}`;
      if (storeId) {
        remotePath += `/stores/${storeId}/${type}/${fileName}`;
      } else {
        remotePath += `/${type}/${fileName}`;
      }

      this.logger.log(`Deleting file: ${remotePath}`);
      // Check if file exists first to avoid 500
      const parentDir = path.dirname(remotePath);
      const files = await client.list(parentDir);
      const exists = files.some((f) => f.name === fileName);

      if (!exists) {
        return {
          success: true,
          message: `File ${fileName} not found, already deleted.`,
        };
      }

      await client.remove(remotePath);
      return { success: true, message: `Deleted ${fileName}` };
    } catch (err) {
      this.logger.error(`Failed to delete tenant file ${fileName}:`, err);
      // If parent directory doesn't exist, basic-ftp list will fail.
      // We can treat this as "already deleted"
      return {
        success: true,
        message: `Directory not found, file ${fileName} does not exist.`,
      };
    } finally {
      client.close();
    }
  }

  /**
   * Lists files in a tenant/store directory.
   */
  async listTenantFiles(
    businessId: string,
    storeId: string | null,
    type: string,
  ) {
    const client = new ftp.Client();
    try {
      await client.access(this.getFtpConfig());
      let remoteDir = `/public_html/tenants/${businessId}`;
      if (storeId) {
        remoteDir += `/stores/${storeId}/${type}`;
      } else {
        remoteDir += `/${type}`;
      }

      this.logger.log(`Listing files in: ${remoteDir}`);
      const list = await client.list(remoteDir);
      return list.map((item) => {
        const publicPath = remoteDir.replace('/public_html', '');
        return {
          name: item.name,
          size: item.size,
          modifiedAt: item.modifiedAt,
          type: item.type === ftp.FileType.File ? 'file' : 'directory',
          url: `${this.configService.get<string>('FTP_Public_URL', '')}${publicPath}/${item.name}`,
        };
      });
    } catch (err) {
      this.logger.error(`Failed to list tenant files in ${businessId}:`, err);
      return []; // Return empty list on error (e.g., directory not found)
    } finally {
      client.close();
    }
  }

  /**
   * Uploads all files from the backend/uploads directory to the FTP server.
   */
  async uploadFromUploadsFolder() {
    const client = new ftp.Client();
    // client.ftp.verbose = true; // Uncomment for debugging

    try {
      const config = this.getFtpConfig();
      this.logger.log(`Connecting to FTP server: ${config.host}`);

      await client.access(config);
      this.logger.log('FTP connection successful');

      const files = fs.readdirSync(this.uploadsPath);
      const filesToUpload = files.filter((file) => {
        const filePath = path.join(this.uploadsPath, file);
        return fs.statSync(filePath).isFile();
      });

      if (filesToUpload.length === 0) {
        this.logger.warn('No files found in uploads folder to upload');
        return {
          success: true,
          message: 'No files to upload',
          uploadedCount: 0,
        };
      }

      this.logger.log(`Found ${filesToUpload.length} files to upload`);

      for (const file of filesToUpload) {
        const localFile = path.join(this.uploadsPath, file);
        this.logger.log(`Uploading ${file}...`);
        await client.uploadFrom(localFile, file);
        this.logger.log(`Successfully uploaded ${file}`);
      }

      return {
        success: true,
        message: `Successfully uploaded ${filesToUpload.length} files`,
        uploadedCount: filesToUpload.length,
      };
    } catch (err) {
      this.logger.error('FTP Upload failed:', err);
      throw err;
    } finally {
      client.close();
    }
  }

  /**
   * Uploads a single file to the FTP server.
   */
  async uploadFile(localPath: string, remoteName: string) {
    const client = new ftp.Client();
    try {
      await client.access(this.getFtpConfig());
      await client.uploadFrom(localPath, remoteName);
      return { success: true, file: remoteName };
    } catch (err) {
      this.logger.error(`Failed to upload ${remoteName}:`, err);
      throw err;
    } finally {
      client.close();
    }
  }
}
