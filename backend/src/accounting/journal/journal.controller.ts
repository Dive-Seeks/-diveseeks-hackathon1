import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JournalService } from './journal.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { ListJournalDto } from './dto/list-journal.dto';
import { JournalFilterDto } from './dto/journal-filter.dto';

@UseGuards(JwtAuthGuard)
@Controller('accounting/journal')
export class JournalController {
  constructor(private readonly service: JournalService) {}
  @Post() create(@Request() req: any, @Body() dto: CreateJournalDto) {
    return this.service.createEntry(req.user.tenantId, dto);
  }
  @Post(':id/void') void_(
    @Request() req: any,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.service.voidEntry(req.user.tenantId, id, reason);
  }

  @Get()
  findAll(@Request() req: any, @Query() dto: ListJournalDto) {
    return this.service.findAll(req.user.tenantId, dto);
  }

  @Get(':id')
  findById(@Request() req: any, @Param('id') id: string) {
    return this.service.findById(req.user.tenantId, id);
  }

  @Get('ledger/:accountId')
  getLedger(
    @Request() req: any,
    @Param('accountId') accountId: string,
    @Query() dto: JournalFilterDto,
  ) {
    return this.service.getLedger(req.user.tenantId, accountId, dto);
  }
}
