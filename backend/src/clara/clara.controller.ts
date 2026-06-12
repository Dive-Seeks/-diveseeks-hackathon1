import {
  Controller,
  Post,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClaraService } from './clara.service';

@UseGuards(JwtAuthGuard)
@Controller('clara')
export class ClaraController {
  constructor(private readonly clara: ClaraService) {}

  @Post('report/weekly')
  weekly(@Request() req: any, @Query('siteId') siteId?: string) {
    console.log('ClaraController: weekly report requested by user:', req.user);
    return this.clara.runWeeklyReport(req.user.tenantId, siteId);
  }

  @Post('report/monthly')
  monthly(@Request() req: any, @Query('siteId') siteId?: string) {
    return this.clara.runMonthlyReport(req.user.tenantId, siteId);
  }
}
