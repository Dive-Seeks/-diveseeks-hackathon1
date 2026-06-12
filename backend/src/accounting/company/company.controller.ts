import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';

@UseGuards(JwtAuthGuard)
@Controller('accounting/company')
export class CompanyController {
  constructor(private readonly service: CompanyService) {}
  @Get() find(@Request() req: any) {
    return this.service.findByTenant(req.user.tenantId);
  }
  @Post() create(@Request() req: any, @Body() dto: CreateCompanyDto) {
    return this.service.findOrCreate(req.user.tenantId, dto);
  }
  @Patch() update(@Request() req: any, @Body() dto: Partial<CreateCompanyDto>) {
    return this.service.update(req.user.tenantId, dto);
  }
}
