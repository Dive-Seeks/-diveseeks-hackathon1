import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Site } from '../sites/entities/site.entity';
import { WebsiteBuilderService } from './website-builder.service';
import {
  WebsiteBuilderController,
  PublicSiteController,
} from './website-builder.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Site])],
  controllers: [WebsiteBuilderController, PublicSiteController],
  providers: [WebsiteBuilderService],
  exports: [WebsiteBuilderService],
})
export class WebsiteBuilderModule {}
