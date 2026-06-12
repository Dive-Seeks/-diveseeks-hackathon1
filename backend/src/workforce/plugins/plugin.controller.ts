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
import { PluginService } from './plugin.service';
import { CreatePluginDto, UpdatePluginDto } from './plugin.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('workforce/plugins')
export class PluginController {
  constructor(private readonly pluginService: PluginService) {}

  @Get('scan')
  scanFiles() {
    return this.pluginService.scanPluginFiles();
  }

  @Get()
  findAll(@Req() req: any) {
    return this.pluginService.findAll(req.user.tenantId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreatePluginDto) {
    return this.pluginService.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePluginDto,
  ) {
    return this.pluginService.update(id, req.user.tenantId, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.pluginService.remove(id, req.user.tenantId);
  }
}
