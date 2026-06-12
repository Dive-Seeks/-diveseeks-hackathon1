import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { McpManagerService, McpServerConfig } from './mcp-manager.service';

@Controller('diveseeks/mcp')
export class McpController {
  constructor(private readonly mcpManager: McpManagerService) {}

  @Post('connect')
  async connect(@Body() config: McpServerConfig) {
    try {
      await this.mcpManager.connect(config);
      const tools = await this.mcpManager.listTools(config.name);
      return {
        status: 'connected',
        serverName: config.name,
        toolCount: tools.length,
        tools: tools,
      };
    } catch (err) {
      throw new HttpException(
        { status: 'error', message: err.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':name/tools')
  async getTools(@Param('name') name: string) {
    try {
      const tools = await this.mcpManager.listTools(name);
      return { serverName: name, tools };
    } catch (err) {
      throw new HttpException(
        { status: 'error', message: err.message },
        HttpStatus.NOT_FOUND,
      );
    }
  }
}
