import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PromptCrudService } from './services/prompt-crud.service';
import { PromptVersionService } from './services/prompt-version.service';
import { PromptCompilerService } from './services/prompt-compiler.service';
import { PromptResolverService } from './services/prompt-resolver.service';
import {
  CreatePromptDto,
  UpdatePromptDto,
  CreatePromptVersionDto,
  CompilePromptDto,
  QueryPromptsDto,
  CreatePartialDto,
  UpdatePartialDto,
} from './dto/prompt.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromptPartial } from './entities/prompt-partial.entity';

@Controller('prompts')
@UseGuards(JwtAuthGuard)
export class PromptEngineController {
  constructor(
    private readonly crudService: PromptCrudService,
    private readonly versionService: PromptVersionService,
    private readonly compiler: PromptCompilerService,
    private readonly resolver: PromptResolverService,
    @InjectRepository(PromptPartial)
    private readonly partialRepo: Repository<PromptPartial>,
  ) {}

  @Get()
  list(@Req() req: any, @Query() query: QueryPromptsDto) {
    return this.crudService.list(req.user.tenantId, query);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreatePromptDto) {
    return this.crudService.create(dto, req.user.tenantId, req.user.userId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.crudService.findOne(id, req.user.tenantId);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromptDto,
  ) {
    return this.crudService.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  archive(@Req() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.crudService.archive(id, req.user.tenantId);
  }

  @Get(':id/versions')
  listVersions(@Param('id', ParseUUIDPipe) id: string) {
    return this.versionService.listVersions(id);
  }

  @Post(':id/versions')
  createVersion(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePromptVersionDto,
  ) {
    return this.versionService.createVersion(id, dto.body, {
      variableSchema: dto.variableSchema,
      partialRefs: dto.partialRefs,
      changeNote: dto.changeNote,
      createdBy: req.user.userId,
    });
  }

  @Post(':id/versions/:vid/publish')
  publishVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('vid', ParseUUIDPipe) vid: string,
  ) {
    return this.versionService.publish(id, vid);
  }

  @Post(':id/versions/:vid/rollback')
  rollbackVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('vid', ParseUUIDPipe) vid: string,
  ) {
    return this.versionService.rollback(id, vid);
  }

  @Get(':id/diff')
  diff(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('from', ParseIntPipe) from: number,
    @Query('to', ParseIntPipe) to: number,
  ) {
    return this.versionService.diff(id, from, to);
  }

  @Post(':id/compile')
  async compile(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompilePromptDto,
  ) {
    const prompt = await this.crudService.findOne(id, req.user.tenantId);
    if (!prompt.currentVersionId) return { error: 'No published version' };

    const version = await this.versionService.getVersion(
      id,
      prompt.currentVersionId,
    );
    const partials = await this.partialRepo
      .createQueryBuilder('p')
      .where('p.slug IN (:...slugs)', {
        slugs: version.partialRefs.length ? version.partialRefs : ['__none__'],
      })
      .andWhere('(p.tenantId = :tenantId OR p.tenantId IS NULL)', {
        tenantId: req.user.tenantId,
      })
      .getMany();

    const partialMap = new Map(partials.map((p) => [p.slug, p.body]));
    const rendered = this.compiler.compile(
      version.body,
      dto.variables,
      partialMap,
    );
    return {
      rendered,
      variablesUsed: this.compiler.extractVariables(version.body),
    };
  }

  @Post(':id/resolve')
  async resolve(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompilePromptDto,
  ) {
    const prompt = await this.crudService.findOne(id, req.user.tenantId);
    const rendered = await this.resolver.resolveBySlug(
      prompt.slug,
      req.user.tenantId,
      dto.variables,
    );
    return { rendered };
  }
}
