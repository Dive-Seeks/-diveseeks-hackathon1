import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnabledToHermesAgentInstances1781654400000
  implements MigrationInterface
{
  name = 'AddEnabledToHermesAgentInstances1781654400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hermes_agent_instances"
      ADD COLUMN IF NOT EXISTS "enabled" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "hermes_agent_instances" DROP COLUMN IF EXISTS "enabled"
    `);
  }
}
