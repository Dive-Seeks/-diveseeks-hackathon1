import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { McpRegistryService } from './mcp-registry.service';
import { RegisterMcpDto } from './dto/register-mcp.dto';
import { McpToolbeltService } from './mcp-toolbelt.service';
import { McpVaultService } from './mcp-vault.service';
import { SpecialistId } from './entities/mcp-server-registration.entity';

@Controller('diveseeks/mcp-registry')
export class McpRegistryController {
  private readonly logger = new Logger(McpRegistryController.name);

  constructor(
    private readonly service: McpRegistryService,
    private readonly toolbelt: McpToolbeltService,
    private readonly vault: McpVaultService,
  ) {}

  @Get(':teamId')
  async list(@Param('teamId') teamId: string) {
    return { servers: await this.service.findAll(teamId) };
  }

  @Post(':teamId')
  async register(@Param('teamId') teamId: string, @Body() dto: RegisterMcpDto) {
    const registration = await this.service.register(teamId, dto);
    return {
      serverId: registration.id,
      status: registration.status,
      toolsAvailable: registration.toolsAvailable,
      message: `MCP server [${registration.name}] validated and active ✓`,
    };
  }

  @Post(':teamId/:serverId/validate')
  async validate(@Param('serverId') serverId: string) {
    const registration = await this.service.validateById(serverId);
    return {
      status: registration.status,
      toolsAvailable: registration.toolsAvailable,
      error: registration.validationError,
    };
  }

  @Post(':mcpId/refresh-capabilities')
  async refreshCapabilities(@Param('mcpId') mcpId: string) {
    await this.service.refreshCapabilities(mcpId);
    return { message: `Capabilities refreshed for MCP ${mcpId}` };
  }

  @Post('heartbeat/:mcpId')
  @HttpCode(204)
  async heartbeat(@Param('mcpId') mcpId: string) {
    await this.service.heartbeat(mcpId);
  }

  @Post(':teamId/:mcpId/revoke')
  async revoke(
    @Param('mcpId') mcpId: string,
    @Body() body: { reason?: string },
  ) {
    await this.service.revoke(mcpId, body.reason);
    return { message: `MCP ${mcpId} revoked` };
  }

  @Delete(':teamId/:serverId')
  async delete(@Param('serverId') serverId: string) {
    await this.service.delete(serverId);
    return { message: 'MCP server removed successfully' };
  }

  @Post(':teamId/:mcpId/vault/store')
  async storeKey(
    @Param('mcpId') mcpId: string,
    @Body() body: { llmApiKey: string },
  ) {
    await this.vault.storeKey(mcpId, body.llmApiKey);
    return { message: `LLM key stored for MCP ${mcpId}` };
  }

  @Post(':teamId/:mcpId/vault/revoke')
  async revokeKey(@Param('mcpId') mcpId: string) {
    await this.vault.revokeKey(mcpId);
    return { message: `LLM key revoked for MCP ${mcpId}` };
  }

  @Get(':teamId/:mcpId/vault/status')
  async vaultStatus(@Param('mcpId') mcpId: string) {
    return { hasKey: await this.vault.hasKey(mcpId) };
  }

  @Get(':teamId/:serverId/toolbelt')
  async previewToolbelt(
    @Param('teamId') teamId: string,
    @Param('serverId') serverId: string,
  ) {
    // Logic to show which specialists would get this server
    // For simplicity, we show the current assignments
    const registration = await this.service.findAll(teamId);
    const server = registration.find((s) => s.id === serverId);

    if (!server) return { assignments: [] };

    const specialists: SpecialistId[] = [
      'rex',
      'nova',
      'kai',
      'sage',
      'atlas',
      'orion',
      'pixel',
      'luma',
      'felix',
      'vex',
    ];
    const assignments = specialists
      .filter((s) => {
        if (server.assignedTo === 'all') return true;
        if (Array.isArray(server.assignedTo) && server.assignedTo.includes(s))
          return true;
        return false;
      })
      .map((s) => ({
        specialist: s,
        tools: server.toolsAvailable,
      }));

    return { assignments };
  }
}
