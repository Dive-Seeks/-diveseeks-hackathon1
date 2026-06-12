import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { MenuImagesController } from './menu-images.controller';
import { MenuImagesService } from './menu-images.service';
import { GeneratedImage } from './entities/generated-image.entity';
import { ImageAnalysisService } from './services/image-analysis.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { MenuImageGenerationProcessor } from './menu-image-generation.processor';
import { FtpModule } from '../ftp/ftp.module';
import { MenuEmbeddingsModule } from '../menu-embeddings/menu-embeddings.module';
import { GatewaysModule } from '../gateways/gateways.module';
import { StoreImage } from '../store-images/entities/store-image.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([GeneratedImage, StoreImage]),
    BullModule.registerQueue({ name: 'menu-image-generation' }),
    FtpModule,
    MenuEmbeddingsModule,
    GatewaysModule,
  ],
  controllers: [MenuImagesController],
  providers: [
    MenuImagesService,
    ImageAnalysisService,
    PromptBuilderService,
    MenuImageGenerationProcessor,
  ],
  exports: [MenuImagesService],
})
export class MenuImagesModule {}
