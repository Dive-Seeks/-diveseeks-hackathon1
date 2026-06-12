import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalIntegrationsService } from './external-integrations.service';
import { ExternalIntegrationsController } from './external-integrations.controller';
import { ExternalIntegration } from './entities/external-integration.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExternalIntegration])],
  controllers: [ExternalIntegrationsController],
  providers: [ExternalIntegrationsService],
  exports: [ExternalIntegrationsService],
})
export class ExternalIntegrationsModule {}
