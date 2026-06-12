import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPredictionMetaToTaskTrajectories1781126400000 implements MigrationInterface {
  name = 'AddPredictionMetaToTaskTrajectories1781126400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "task_trajectories"
      ADD COLUMN IF NOT EXISTS "prediction_meta" jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "task_trajectories"
      DROP COLUMN IF EXISTS "prediction_meta"
    `);
  }
}
