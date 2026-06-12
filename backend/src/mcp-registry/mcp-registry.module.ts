import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { McpServerRegistration } from './entities/mcp-server-registration.entity';
import { McpCredential } from './entities/mcp-credential.entity';
import { McpRegistryController } from './mcp-registry.controller';
import { McpRegistryService } from './mcp-registry.service';
import { McpValidatorService } from './mcp-validator.service';
import { McpToolbeltService } from './mcp-toolbelt.service';
import { McpVaultService } from './mcp-vault.service';
import { GatewaysModule } from '../gateways/gateways.module';

import { McpDispatchService } from './mcp-dispatch.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([McpServerRegistration, McpCredential]),
    GatewaysModule,
    ConfigModule,
  ],
  controllers: [McpRegistryController],
  providers: [
    McpRegistryService,
    McpValidatorService,
    McpToolbeltService,
    McpVaultService,
    McpDispatchService,
  ],
  exports: [
    McpRegistryService,
    McpToolbeltService,
    McpVaultService,
    McpDispatchService,
  ],
})
export class McpRegistryModule {}
