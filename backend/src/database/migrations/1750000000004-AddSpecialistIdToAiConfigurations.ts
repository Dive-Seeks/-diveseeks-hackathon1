import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpecialistIdToAiConfigurations1750000000004 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE ai_configurations ADD COLUMN IF NOT EXISTS specialist_id VARCHAR NULL`,
    );
    // Partial unique index: only enforces uniqueness when specialist_id is not null.
    // Rows with specialist_id IS NULL (team-wide keys) are unrestricted by this index;
    // the existing ORM-level (userId, context) index covers those.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_ai_config_user_context_specialist
       ON ai_configurations (user_id, context, specialist_id)
       WHERE specialist_id IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS uq_ai_config_user_context_specialist`,
    );
    await queryRunner.query(
      `ALTER TABLE ai_configurations DROP COLUMN IF EXISTS specialist_id`,
    );
  }
}
