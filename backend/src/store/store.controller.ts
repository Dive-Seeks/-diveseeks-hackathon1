import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Logger,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StoreService } from './store.service';
import { UpdateIncompleteStoreDto } from './dto/update-incomplete-store.dto';
import {
  STORE_RECORD_ACCESS_ROLES,
  UserRole,
} from '../users/entities/user.entity';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    role?: UserRole;
  };
}

@ApiTags('Store')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('store/incomplete')
export class StoreController {
  private readonly logger = new Logger(StoreController.name);

  constructor(private readonly storeService: StoreService) {}

  private assertStoreRoleAccess(role?: UserRole) {
    if (!role || !STORE_RECORD_ACCESS_ROLES.has(role)) {
      throw new ForbiddenException(
        'Insufficient role permissions to access store records',
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get incomplete store details by id' })
  @ApiResponse({ status: 200, description: 'Incomplete store record details' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  async getIncompleteRecord(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    this.assertStoreRoleAccess(req.user.role);
    this.logger.log(
      `Fetching incomplete store ${id} for user ${req.user.userId}`,
    );
    return this.storeService.getIncompleteRecord(req.user.userId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update incomplete store record by id' })
  @ApiResponse({ status: 200, description: 'Incomplete store record updated' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  async updateIncompleteRecord(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
    @Body() updateDto: UpdateIncompleteStoreDto,
  ) {
    this.assertStoreRoleAccess(req.user.role);
    this.logger.log(
      `Updating incomplete store ${id} for user ${req.user.userId}`,
    );
    return this.storeService.updateIncompleteRecord(
      req.user.userId,
      id,
      updateDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete incomplete store record by id' })
  @ApiResponse({ status: 200, description: 'Incomplete store record deleted' })
  @ApiResponse({ status: 404, description: 'Record not found' })
  async deleteIncompleteRecord(
    @Req() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    this.assertStoreRoleAccess(req.user.role);
    this.logger.log(
      `Deleting incomplete store ${id} for user ${req.user.userId}`,
    );
    return this.storeService.deleteIncompleteRecord(req.user.userId, id);
  }
}
