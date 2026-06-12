import { Module } from '@nestjs/common';
import { SpecialistFactoryService } from './specialist-factory.service';
import { ZaraService } from './zara.service';
import { MarcoService } from './marco.service';
import { KaiService } from './kai.service';
import { RexService } from './rex.service';
import { SageService } from './sage.service';
import { NovaService } from './nova.service';
import { AtlasService } from './atlas.service';
import { AriaService } from './aria.service';
import { PixelService } from './pixel.service';
import { DepotService } from './depot.service';
import { LumaService } from './luma.service';
// Retail specialists
import { RioService } from './rio.service';
import { VeraService } from './vera.service';
import { ClioService } from './clio.service';
import { BoltService } from './bolt.service';
import { FinnService } from './finn.service';
import { MiraService } from './mira.service';
import { DashService } from './dash.service';
// Ecommerce specialists
import { LunaService } from './luna.service';
import { KiraService } from './kira.service';
import { EmberService } from './ember.service';
import { ScoutService } from './scout.service';
import { FluxService } from './flux.service';
import { IvyService } from './ivy.service';
import { RemyService } from './remy.service';
// SEO sub-team
import { OrionService } from './orion.service';
import { VexService } from './vex.service';
import { SeoSubTeamService } from './seo-sub-team.service';
import { HeartbeatModule } from '../heartbeat/heartbeat.module';
import { ActivityModule } from '../activity/activity.module';
import { AdsModule } from '../ads/ads.module';

@Module({
  imports: [HeartbeatModule, ActivityModule, AdsModule],
  providers: [
    SpecialistFactoryService,
    ZaraService,
    MarcoService,
    KaiService,
    RexService,
    SageService,
    NovaService,
    AtlasService,
    AriaService,
    PixelService,
    DepotService,
    LumaService,
    RioService,
    VeraService,
    ClioService,
    BoltService,
    FinnService,
    MiraService,
    DashService,
    LunaService,
    KiraService,
    EmberService,
    ScoutService,
    FluxService,
    IvyService,
    RemyService,
    OrionService,
    VexService,
    SeoSubTeamService,
  ],
  exports: [
    ZaraService,
    MarcoService,
    KaiService,
    RexService,
    SageService,
    NovaService,
    AtlasService,
    AriaService,
    PixelService,
    DepotService,
    LumaService,
    RioService,
    VeraService,
    ClioService,
    BoltService,
    FinnService,
    MiraService,
    DashService,
    LunaService,
    KiraService,
    EmberService,
    ScoutService,
    FluxService,
    IvyService,
    RemyService,
    OrionService,
    VexService,
    SeoSubTeamService,
  ],
})
export class SpecialistsModule {}
