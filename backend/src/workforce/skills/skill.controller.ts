import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { SkillService } from './skill.service';
import { CreateSkillDto, UpdateSkillDto } from './skill.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('workforce/skills')
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @Get('scan')
  scanFiles() {
    return this.skillService.scanSkillFiles();
  }

  @Get()
  findAll(@Req() req: any) {
    return this.skillService.findAll(req.user.tenantId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateSkillDto) {
    return this.skillService.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSkillDto,
  ) {
    return this.skillService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.skillService.remove(id, req.user.tenantId);
  }
}
