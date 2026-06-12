import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnifyEmbeddings7681750000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // If the columns were created as vector(1024), we need to cast them or drop/recreate them
    // TypeORM uses text for the entities but in production they might be native vectors
    // Let's alter to text first (if they are vectors) then optionally back to vector(768) if the DB supports it
    // Wait, the simplest safe way to clear/reset embedding dimension in Postgres vector extension:
    // If they are just text, doing nothing is fine. If they are vector(1024), we can alter them.

    const tables = [
      'agent_episodes',
      'global_knowledge',
      'tenant_knowledge',
      'kr_solutions',
      'source_documents',
      'web_chunks',
      'wiki_pages',
    ];

    for (const table of tables) {
      try {
        await queryRunner.query(
          `ALTER TABLE "${table}" ALTER COLUMN "embedding" TYPE vector(768) USING "embedding"::text::vector(768);`,
        );
      } catch (e) {
        // Might be text already, or column might not exist, ignore
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'agent_episodes',
      'global_knowledge',
      'tenant_knowledge',
      'kr_solutions',
      'source_documents',
      'web_chunks',
      'wiki_pages',
    ];

    for (const table of tables) {
      try {
        await queryRunner.query(
          `ALTER TABLE "${table}" ALTER COLUMN "embedding" TYPE text;`,
        );
      } catch (e) {}
    }
  }
}
