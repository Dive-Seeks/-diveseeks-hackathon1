import { MigrationInterface, QueryRunner } from 'typeorm';

export class CoordinatorNameUniqueCi1747900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_agents_coordinator_name_ci"
      ON "agents" (LOWER("name"))
      WHERE "role" = 'coordinator'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_agents_coordinator_name_ci"`,
    );
  }
}
