import {
  Body,
  Controller,
  Get,
  Patch,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantClsService } from '../common/cls/tenant-cls.service';
import { UpdateHermesSettingsDto } from './dto/update-hermes-settings.dto';
import { HermesAgentService } from './hermes-agent.service';

@Controller('hermes-agent')
@UseGuards(JwtAuthGuard)
export class HermesAgentController {
  constructor(
    private readonly hermesAgent: HermesAgentService,
    private readonly cls: TenantClsService,
  ) {}

  private tenantId(): string {
    const tenantId = this.cls.getTenantId();
    if (!tenantId) {
      throw new UnauthorizedException('No tenant context');
    }
    return tenantId;
  }

  @Get('settings')
  async getSettings(): Promise<{ enabled: boolean; status: string }> {
    return this.hermesAgent.getSettings(this.tenantId());
  }

  @Patch('settings')
  async updateSettings(
    @Body() dto: UpdateHermesSettingsDto,
  ): Promise<{ enabled: boolean; status: string }> {
    const tenantId = this.tenantId();
    await this.hermesAgent.setEnabled(tenantId, dto.enabled);
    return this.hermesAgent.getSettings(tenantId);
  }
}
