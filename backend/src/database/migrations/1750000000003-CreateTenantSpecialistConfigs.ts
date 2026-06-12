import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantSpecialistConfigs1750000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE tenant_specialist_configs (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id        UUID NOT NULL,
        specialist_id    VARCHAR NOT NULL,
        blocked          BOOLEAN NOT NULL DEFAULT false,
        routing_boost    DECIMAL(4,2) NOT NULL DEFAULT 1.0,
        prompt_append    TEXT,
        daily_token_cap  INT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_tenant_specialist_configs_tenant_specialist
        ON tenant_specialist_configs (tenant_id, specialist_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE tenant_specialist_configs;`);
  }
}
