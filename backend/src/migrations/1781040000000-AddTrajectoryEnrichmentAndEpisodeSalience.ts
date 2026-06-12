import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrajectoryEnrichmentAndEpisodeSalience1781040000000 implements MigrationInterface {
  name = 'AddTrajectoryEnrichmentAndEpisodeSalience1781040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "task_trajectories"
      ADD COLUMN IF NOT EXISTS "emotion_tag" varchar(255),
      ADD COLUMN IF NOT EXISTS "failure_class" varchar(255),
      ADD COLUMN IF NOT EXISTS "criteria_met_count" integer,
      ADD COLUMN IF NOT EXISTS "criteria_unmet_count" integer,
      ADD COLUMN IF NOT EXISTS "iteration_count" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "agent_episodes"
      ADD COLUMN IF NOT EXISTS "emotion_tag" varchar(255),
      ADD COLUMN IF NOT EXISTS "salience_priority" varchar(50)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agent_episodes"
      DROP COLUMN IF EXISTS "salience_priority",
      DROP COLUMN IF EXISTS "emotion_tag"
    `);

    await queryRunner.query(`
      ALTER TABLE "task_trajectories"
      DROP COLUMN IF EXISTS "iteration_count",
      DROP COLUMN IF EXISTS "criteria_unmet_count",
      DROP COLUMN IF EXISTS "criteria_met_count",
      DROP COLUMN IF EXISTS "failure_class",
      DROP COLUMN IF EXISTS "emotion_tag"
    `);
  }
}
