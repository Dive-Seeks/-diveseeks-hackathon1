import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('accounting/reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}
  @Get('trial-balance') tb(@Request() req: any, @Query('siteId') s?: string) {
    return this.service.getTrialBalance(req.user.tenantId, s);
  }
  @Get('pl') pl(
    @Request() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('siteId') s?: string,
  ) {
    return this.service.getProfitAndLoss(
      req.user.tenantId,
      new Date(from),
      new Date(to),
      s,
    );
  }
  @Get('balance-sheet') bs(@Request() req: any) {
    return this.service.getBalanceSheet(req.user.tenantId);
  }

  @Get('cash-flow')
  getCashFlow(
    @Request() req: any,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('siteId') s?: string,
  ) {
    return this.service.getCashFlowStatement(req.user.tenantId, from, to, s);
  }

  @Get('aged-debtors')
  getAgedDebtors(@Request() req: any, @Query('asOfDate') asOfDate?: string) {
    return this.service.getAgedDebtors(req.user.tenantId, asOfDate);
  }

  @Get('aged-creditors')
  getAgedCreditors(@Request() req: any, @Query('asOfDate') asOfDate?: string) {
    return this.service.getAgedCreditors(req.user.tenantId, asOfDate);
  }
}
