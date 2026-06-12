import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStepColumnsToTaskSessions1750000000006 implements MigrationInterface {
  name = 'AddStepColumnsToTaskSessions1750000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_sessions" ADD COLUMN IF NOT EXISTS "current_step"       character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_sessions" ADD COLUMN IF NOT EXISTS "current_group"      character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_sessions" ADD COLUMN IF NOT EXISTS "last_completed_step" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_sessions" ADD COLUMN IF NOT EXISTS "step_checkpoint"    jsonb`,
    );
    // Extend status enum — safe on PostgreSQL with no table rewrite
    await queryRunner.query(
      `ALTER TYPE "public"."task_sessions_status_enum" ADD VALUE IF NOT EXISTS 'needs_human'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."task_sessions_status_enum" ADD VALUE IF NOT EXISTS 'orphaned'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_sessions" DROP COLUMN IF EXISTS "step_checkpoint"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_sessions" DROP COLUMN IF EXISTS "last_completed_step"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_sessions" DROP COLUMN IF EXISTS "current_group"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_sessions" DROP COLUMN IF EXISTS "current_step"`,
    );
    // Note: PostgreSQL does not support removing enum values. Down leaves the new values in place.
  }
}
