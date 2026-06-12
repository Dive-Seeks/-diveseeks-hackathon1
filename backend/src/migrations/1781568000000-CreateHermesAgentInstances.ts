import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHermesAgentInstances1781568000000 implements MigrationInterface {
  name = 'CreateHermesAgentInstances1781568000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hermes_agent_instances" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL,
        "container_name" varchar(128) NOT NULL,
        "endpoint" varchar(256) NOT NULL,
        "api_server_key" varchar(128) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'provisioning',
        "last_used_at" timestamptz NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ux_hermes_agent_instances_tenant"
      ON "hermes_agent_instances" ("tenant_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "ux_hermes_agent_instances_tenant"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "hermes_agent_instances"`);
  }
}
