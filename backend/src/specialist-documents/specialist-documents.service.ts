// backend/src/specialist-documents/specialist-documents.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpecialistDocument } from './entities/specialist-document.entity';
import { AgentEpisode } from '../memory/agent-episode.entity';
import { CreateSpecialistDocumentDto } from './dto/create-specialist-document.dto';
import { UpdateSpecialistDocumentDto } from './dto/update-specialist-document.dto';
import { VertexEmbeddingService } from '../common/vertex-embedding.service';

@Injectable()
export class SpecialistDocumentsService {
  private readonly logger = new Logger(SpecialistDocumentsService.name);

  constructor(
    @InjectRepository(SpecialistDocument)
    private readonly repo: Repository<SpecialistDocument>,
    @InjectRepository(AgentEpisode)
    private readonly episodeRepo: Repository<AgentEpisode>,
    private readonly vertexEmbed: VertexEmbeddingService,
  ) {}

  async findAllGrouped(
    tenantId: string,
    projectId: string,
  ): Promise<Record<string, SpecialistDocument[]>> {
    const docs = await this.repo.find({
      where: { tenantId, projectId },
      order: { updatedAt: 'DESC' },
      select: [
        'id',
        'specialistId',
        'title',
        'documentType',
        'version',
        'createdAt',
        'updatedAt',
        'content',
      ],
    });
    return docs.reduce<Record<string, SpecialistDocument[]>>((acc, doc) => {
      (acc[doc.specialistId] ??= []).push(doc);
      return acc;
    }, {});
  }

  async findRelated(
    tenantId: string,
    projectId: string,
    docId: string,
    limit = 5,
  ): Promise<SpecialistDocument[]> {
    const source = await this.repo.findOne({
      where: { id: docId, tenantId, projectId },
      select: ['id', 'embedding'],
    });
    if (!source?.embedding) return [];

    return this.repo.query(
      `SELECT id, tenant_id, project_id, specialist_id, title, content, document_type, version, created_at, updated_at
       FROM specialist_documents
       WHERE project_id = $1
         AND tenant_id = $2
         AND id != $3
         AND embedding IS NOT NULL
       ORDER BY CAST(embedding AS vector) <=> CAST($4 AS vector)
       LIMIT $5`,
      [projectId, tenantId, docId, JSON.stringify(source.embedding), limit],
    );
  }

  async findBySpecialist(
    tenantId: string,
    projectId: string,
    specialistId: string,
  ): Promise<SpecialistDocument[]> {
    return this.repo.find({
      where: { tenantId, projectId, specialistId },
      order: { updatedAt: 'DESC' },
      select: [
        'id',
        'specialistId',
        'title',
        'documentType',
        'version',
        'createdAt',
        'updatedAt',
        'content',
      ],
    });
  }

  async create(
    tenantId: string,
    projectId: string,
    dto: CreateSpecialistDocumentDto,
  ): Promise<SpecialistDocument> {
    return this.upsert(
      tenantId,
      projectId,
      dto.specialistId,
      dto.title,
      dto.content,
      dto.documentType ?? 'general',
    );
  }

  async update(
    tenantId: string,
    projectId: string,
    docId: string,
    dto: UpdateSpecialistDocumentDto,
  ): Promise<SpecialistDocument> {
    const doc = await this.repo.findOneOrFail({
      where: { id: docId, tenantId, projectId },
      select: [
        'id',
        'title',
        'content',
        'documentType',
        'version',
        'tenantId',
        'projectId',
      ],
    });
    if (dto.title !== undefined) doc.title = dto.title;
    if (dto.content !== undefined) doc.content = dto.content;
    if (dto.documentType !== undefined) doc.documentType = dto.documentType;
    doc.version += 1;
    return this.repo.save(doc);
  }

  async remove(
    tenantId: string,
    projectId: string,
    docId: string,
  ): Promise<void> {
    await this.repo.delete({ id: docId, tenantId, projectId });
  }

  async upsert(
    tenantId: string,
    projectId: string,
    specialistId: string,
    title: string,
    content: string,
    documentType: string,
  ): Promise<SpecialistDocument> {
    const existing = await this.repo.findOne({
      where: { tenantId, projectId, specialistId, title },
      select: ['id', 'content', 'documentType', 'version'],
    });
    let saved: SpecialistDocument;
    if (existing) {
      existing.content = content;
      existing.documentType = documentType;
      existing.version += 1;
      saved = await this.repo.save(existing);
    } else {
      saved = await this.repo.save(
        this.repo.create({
          tenantId,
          projectId,
          specialistId,
          title,
          content,
          documentType,
        }),
      );
    }

    // Async embed — non-blocking, non-fatal
    void this.vertexEmbed
      .embed(content.substring(0, 2000))
      .then((vec) =>
        this.repo.update(
          { id: saved.id, tenantId },
          { embedding: vec.map(Number) },
        ),
      )
      .catch((err: Error) =>
        this.logger.warn(
          `[SpecialistDocs] embedding failed for ${saved.id}: ${err.message}`,
        ),
      );

    return saved;
  }

  async writeEpisode(
    tenantId: string,
    specialistId: string,
    projectId: string,
    summary: string,
    domain: string,
    outcome: 'pass' | 'fail' | 'needs_review',
  ): Promise<void> {
    try {
      const embedding = await this.vertexEmbed
        .embed(summary.substring(0, 2000))
        .catch(() => null);

      const episode = this.episodeRepo.create({
        ownerType: 'agent',
        ownerId: specialistId,
        tenantId,
        domain,
        episodeType:
          outcome === 'pass'
            ? 'solution'
            : outcome === 'needs_review'
              ? 'correction'
              : 'pattern',
        keywords: [specialistId, domain, projectId],
        summary: summary.substring(0, 1000),
        strategy: [],
        preconditions: [],
        embedding: embedding ?? null,
      });
      await this.episodeRepo.save(episode);
    } catch (err) {
      // Never throw — episode write failure must not break the caller
      this.logger.warn(
        `[SpecialistDocs] AgentEpisode write failed for ${specialistId}: ${(err as Error).message}`,
      );
    }
  }
}
