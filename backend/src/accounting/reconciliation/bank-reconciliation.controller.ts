import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BankReconciliationService } from './bank-reconciliation.service';
import { CreateBrsDto } from './dto/create-brs.dto';

@UseGuards(JwtAuthGuard)
@Controller('accounting/brs')
export class BankReconciliationController {
  constructor(private readonly service: BankReconciliationService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateBrsDto) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Get()
  findAll(@Request() req: any, @Query('bankAccountId') bankAccountId?: string) {
    return this.service.findAll(req.user.tenantId, bankAccountId);
  }

  @Get(':id')
  findById(@Request() req: any, @Param('id') id: string) {
    return this.service.findById(req.user.tenantId, id);
  }

  @Post(':id/reconcile')
  reconcile(@Request() req: any, @Param('id') id: string) {
    return this.service.reconcile(req.user.tenantId, id);
  }
}
