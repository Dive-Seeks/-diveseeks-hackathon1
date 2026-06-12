import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTaskStepLogs1750000000005 implements MigrationInterface {
  name = 'CreateTaskStepLogs1750000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."task_step_logs_status_enum" AS ENUM (
        'running', 'completed', 'failed', 'degraded', 'skipped'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "task_step_logs" (
        "id"               uuid NOT NULL DEFAULT uuid_generate_v4(),
        "session_id"       uuid NOT NULL,
        "tenant_id"        uuid NOT NULL,
        "step_key"         character varying NOT NULL,
        "group_key"        character varying NOT NULL,
        "attempt"          integer NOT NULL DEFAULT 1,
        "status"           "public"."task_step_logs_status_enum" NOT NULL,
        "error_message"    text,
        "duration_ms"      integer,
        "checkpoint_data"  jsonb,
        "created_at"       TIMESTAMP NOT NULL DEFAULT now(),
        "completed_at"     TIMESTAMP,
        CONSTRAINT "PK_task_step_logs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_task_step_logs_session_step" ON "task_step_logs" ("session_id", "step_key")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_task_step_logs_tenant_created" ON "task_step_logs" ("tenant_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_task_step_logs_tenant_created"`);
    await queryRunner.query(`DROP INDEX "IDX_task_step_logs_session_step"`);
    await queryRunner.query(`DROP TABLE "task_step_logs"`);
    await queryRunner.query(`DROP TYPE "public"."task_step_logs_status_enum"`);
  }
}
