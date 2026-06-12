import { MigrationInterface, QueryRunner } from 'typeorm';

// Phase 0.2 — Production migration to native vector columns.
// NOTE: Only run this AFTER deciding TypeORM synchronize strategy.
// With synchronize:true in dev, TypeORM will revert vector→text on restart
// unless entity @Column declarations are updated or synchronize is disabled
// for these columns. Phase 0.1 CAST hotfix (in service files) is sufficient
// for dev — run this migration in production only.
export class AlterEmbeddingColumnsToVector1781200000000 implements MigrationInterface {
  name = 'AlterEmbeddingColumnsToVector1781200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'agent_episodes',
      'data_engine_wiki_pages',
      'global_knowledge',
      'tenant_knowledge',
      'kr_solutions',
      'menu_embeddings',
      'github_source_documents',
      'specialist_documents',
    ];
    for (const table of tables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "embedding" TYPE vector USING embedding::vector`,
      );
    }
    // user_preferences.embedding is varchar — skip (not used for vector search)
    // web_chunks.embedding is _float8 (float8[]) — separate cast: embedding::vector
    await queryRunner.query(
      `ALTER TABLE "web_chunks" ALTER COLUMN "embedding" TYPE vector USING embedding::vector`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'agent_episodes',
      'data_engine_wiki_pages',
      'global_knowledge',
      'tenant_knowledge',
      'kr_solutions',
      'menu_embeddings',
      'github_source_documents',
      'specialist_documents',
      'web_chunks',
    ];
    for (const table of tables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "embedding" TYPE text USING embedding::text`,
      );
    }
  }
}
