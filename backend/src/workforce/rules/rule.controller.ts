import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { RuleService } from './rule.service';
import { CreateRuleDto, UpdateRuleDto } from './rule.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('workforce/rules')
export class RuleController {
  constructor(private readonly ruleService: RuleService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.ruleService.findAll(req.user.tenantId);
  }

  @Get('builtin')
  readBuiltin(
    @Query('businessType') businessType: string,
    @Query('domain') domain: string,
  ) {
    return this.ruleService.readBuiltinRules(
      businessType || 'restaurant',
      domain,
    );
  }

  @Post()
  upsert(@Req() req: any, @Body() dto: CreateRuleDto) {
    return this.ruleService.upsert(req.user.tenantId, dto);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateRuleDto) {
    return this.ruleService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.ruleService.remove(id, req.user.tenantId);
  }
}
