import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@UseGuards(JwtAuthGuard)
@Controller('accounting/accounts')
export class AccountsController {
  constructor(private readonly service: AccountsService) {}
  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.tenantId);
  }

  @Get('tree')
  getTree(@Request() req: any) {
    return this.service.getTree(req.user.tenantId);
  }

  @Get(':code')
  findByCode(@Request() req: any, @Param('code') code: string) {
    return this.service.findByCode(req.user.tenantId, code);
  }

  @Post()
  create(@Request() req: any, @Body() dto: CreateAccountDto) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.service.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  deactivate(@Request() req: any, @Param('id') id: string) {
    return this.service.deactivate(req.user.tenantId, id);
  }
}
