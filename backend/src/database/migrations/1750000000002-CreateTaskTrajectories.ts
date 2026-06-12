import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTaskTrajectories1750000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE task_trajectories (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id             UUID NOT NULL,
        specialist_id         VARCHAR NOT NULL,
        team                  VARCHAR NOT NULL,
        task_description      TEXT NOT NULL,
        outcome               VARCHAR NOT NULL CHECK (outcome IN ('pass', 'fail', 'needs_review')),
        approved              BOOLEAN NOT NULL DEFAULT false,
        feature_map_id        UUID,
        model_provider        VARCHAR,
        model_id              VARCHAR,
        was_user_model        BOOLEAN NOT NULL DEFAULT false,
        prediction_confidence DECIMAL(4,3),
        prediction_basis      VARCHAR,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_task_trajectories_tenant_specialist_approved_created
        ON task_trajectories (tenant_id, specialist_id, approved, created_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE task_trajectories;`);
  }
}
