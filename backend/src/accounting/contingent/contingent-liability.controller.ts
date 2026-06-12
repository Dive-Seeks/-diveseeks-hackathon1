import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ContingentLiabilityService } from './contingent-liability.service';
import { CreateContingentDto } from './dto/create-contingent.dto';

@UseGuards(JwtAuthGuard)
@Controller('accounting/contingent')
export class ContingentLiabilityController {
  constructor(private readonly service: ContingentLiabilityService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateContingentDto) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.tenantId);
  }

  @Patch(':id')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateContingentDto>,
  ) {
    return this.service.update(req.user.tenantId, id, dto);
  }

  @Post(':id/recognise')
  recognise(@Request() req: any, @Param('id') id: string) {
    return this.service.recognise(req.user.tenantId, id);
  }
}
