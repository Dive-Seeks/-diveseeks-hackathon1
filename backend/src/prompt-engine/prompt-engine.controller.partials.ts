import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PromptCrudService } from './services/prompt-crud.service';
import { CreatePartialDto, UpdatePartialDto } from './dto/prompt.dto';

@Controller('prompt-partials')
@UseGuards(JwtAuthGuard)
export class PromptPartialsController {
  constructor(private readonly crudService: PromptCrudService) {}

  @Get()
  list(@Req() req: any) {
    return this.crudService.listPartials(req.user.tenantId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreatePartialDto) {
    return this.crudService.createPartial(
      dto,
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartialDto,
  ) {
    return this.crudService.updatePartial(id, dto, req.user.tenantId);
  }
}
