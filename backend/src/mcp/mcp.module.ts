import { Module } from '@nestjs/common';
import { McpClientService } from './mcp-client.service';
import { Context7Service } from './context7.service';
import { McpManagerService } from './mcp-manager.service';
import { McpController } from './mcp.controller';

@Module({
  providers: [McpClientService, Context7Service, McpManagerService],
  controllers: [McpController],
  exports: [McpClientService, Context7Service, McpManagerService],
})
export class McpModule {}
