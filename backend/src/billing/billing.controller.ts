import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    tenantId?: string;
    storeId?: string;
    role?: string;
  };
}

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('overview')
  getOverview(@Req() req: RequestWithUser) {
    return this.billingService.getOverview(req.user.userId, req.user.tenantId);
  }

  @Get('invoices')
  getInvoices(
    @Req() req: RequestWithUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: 'paid' | 'pending' | 'failed',
  ) {
    return this.billingService.getInvoices(
      req.user.tenantId,
      page,
      limit,
      status,
    );
  }
}
