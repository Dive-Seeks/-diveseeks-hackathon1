import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Prevents the session-duplication bug (16 tasks had ballooned into ~3,900 pending
 * sessions). Enforces at most one PENDING task_session per
 * (teamId, projectId, taskDescription, specialist). Partial index so terminal
 * statuses (done/failed/needs_human/orphaned) are unconstrained.
 *
 * Run the dedup cleanup BEFORE this migration in environments that already hold
 * duplicate pending rows, otherwise index creation fails on the uniqueness violation.
 */
export class AddTaskSessionPendingDedupIndex1750000000011 implements MigrationInterface {
  name = 'AddTaskSessionPendingDedupIndex1750000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "ux_task_session_pending_dedup" ` +
        `ON "task_sessions" ("teamId", "projectId", "taskDescription", "specialist") ` +
        `WHERE "status" = 'pending'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "ux_task_session_pending_dedup"`,
    );
  }
}
