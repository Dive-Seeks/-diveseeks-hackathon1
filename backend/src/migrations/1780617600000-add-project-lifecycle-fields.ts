import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProjectLifecycleFields1780617600000 implements MigrationInterface {
  name = 'AddProjectLifecycleFields1780617600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "diveseeks_projects"
      ADD COLUMN IF NOT EXISTS "lifecycle_status" varchar(40) NOT NULL DEFAULT 'draft',
      ADD COLUMN IF NOT EXISTS "completion_summary" text,
      ADD COLUMN IF NOT EXISTS "completion_checklist" jsonb,
      ADD COLUMN IF NOT EXISTS "update_requests" jsonb,
      ADD COLUMN IF NOT EXISTS "completed_at" timestamp
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_diveseeks_projects_team_lifecycle"
      ON "diveseeks_projects" ("teamId", "lifecycle_status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_diveseeks_projects_team_lifecycle"`,
    );
    await queryRunner.query(`
      ALTER TABLE "diveseeks_projects"
      DROP COLUMN IF EXISTS "completed_at",
      DROP COLUMN IF EXISTS "update_requests",
      DROP COLUMN IF EXISTS "completion_checklist",
      DROP COLUMN IF EXISTS "completion_summary",
      DROP COLUMN IF EXISTS "lifecycle_status"
    `);
  }
}
