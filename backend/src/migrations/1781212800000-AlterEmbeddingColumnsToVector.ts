import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterEmbeddingColumnsToVector1781212800000 implements MigrationInterface {
  name = 'AlterEmbeddingColumnsToVector1781212800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS vector');
    await queryRunner.query(
      'ALTER TABLE "data_engine_wiki_pages" ALTER COLUMN "embedding" TYPE vector USING "embedding"::vector;',
    );
    await queryRunner.query(
      'ALTER TABLE "user_preferences" ALTER COLUMN "embedding" TYPE vector USING "embedding"::vector;',
    );
    await queryRunner.query(
      'ALTER TABLE "github_source_documents" ALTER COLUMN "embedding" TYPE vector USING "embedding"::vector;',
    );
    await queryRunner.query(
      'ALTER TABLE "kr_solutions" ALTER COLUMN "embedding" TYPE vector USING "embedding"::vector;',
    );
    await queryRunner.query(
      'ALTER TABLE "global_knowledge" ALTER COLUMN "embedding" TYPE vector USING "embedding"::vector;',
    );
    await queryRunner.query(
      'ALTER TABLE "tenant_knowledge" ALTER COLUMN "embedding" TYPE vector USING "embedding"::vector;',
    );
    await queryRunner.query(
      'ALTER TABLE "agent_episodes" ALTER COLUMN "embedding" TYPE vector USING "embedding"::vector;',
    );
    await queryRunner.query(
      'ALTER TABLE "parametric_weights" ALTER COLUMN "applies_when_embedding" TYPE vector USING "applies_when_embedding"::vector;',
    );
    await queryRunner.query(
      'ALTER TABLE "menu_embeddings" ALTER COLUMN "embedding" TYPE vector USING "embedding"::vector;',
    );
    await queryRunner.query(
      'ALTER TABLE "generated_images" ALTER COLUMN "prompt_embedding" TYPE vector USING "prompt_embedding"::vector;',
    );
    await queryRunner.query(
      'ALTER TABLE "specialist_documents" ALTER COLUMN "embedding" TYPE vector USING "embedding"::vector;',
    );
    await queryRunner.query(
      'ALTER TABLE "web_chunks" ALTER COLUMN "embedding" TYPE vector USING "embedding"::vector;',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "data_engine_wiki_pages" ALTER COLUMN "embedding" TYPE text USING "embedding"::text;',
    );
    await queryRunner.query(
      'ALTER TABLE "user_preferences" ALTER COLUMN "embedding" TYPE varchar USING "embedding"::varchar;',
    );
    await queryRunner.query(
      'ALTER TABLE "github_source_documents" ALTER COLUMN "embedding" TYPE text USING "embedding"::text;',
    );
    await queryRunner.query(
      'ALTER TABLE "kr_solutions" ALTER COLUMN "embedding" TYPE text USING "embedding"::text;',
    );
    await queryRunner.query(
      'ALTER TABLE "global_knowledge" ALTER COLUMN "embedding" TYPE text USING "embedding"::text;',
    );
    await queryRunner.query(
      'ALTER TABLE "tenant_knowledge" ALTER COLUMN "embedding" TYPE text USING "embedding"::text;',
    );
    await queryRunner.query(
      'ALTER TABLE "agent_episodes" ALTER COLUMN "embedding" TYPE text USING "embedding"::text;',
    );
    await queryRunner.query(
      'ALTER TABLE "parametric_weights" ALTER COLUMN "applies_when_embedding" TYPE text USING "applies_when_embedding"::text;',
    );
    await queryRunner.query(
      'ALTER TABLE "menu_embeddings" ALTER COLUMN "embedding" TYPE text USING "embedding"::text;',
    );
    await queryRunner.query(
      'ALTER TABLE "generated_images" ALTER COLUMN "prompt_embedding" TYPE text USING "prompt_embedding"::text;',
    );
    await queryRunner.query(
      'ALTER TABLE "specialist_documents" ALTER COLUMN "embedding" TYPE text USING "embedding"::text;',
    );
    await queryRunner.query(
      'ALTER TABLE "web_chunks" ALTER COLUMN "embedding" TYPE float8[] USING "embedding"::float8[];',
    );
  }
}
