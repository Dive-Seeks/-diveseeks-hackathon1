import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateParametricWeights1746619200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE weight_effect AS ENUM ('inject_context', 'block', 'transform_output');
    `);
    await queryRunner.query(`
      CREATE TYPE weight_scope  AS ENUM ('global', 'tenant');
    `);

    await queryRunner.query(`
      CREATE TABLE parametric_weights (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain              TEXT NOT NULL,
        rule                TEXT NOT NULL,
        applies_when        TEXT NOT NULL,
        effect              weight_effect NOT NULL,
        injected_context    TEXT,
        confidence          DECIMAL(4,3) NOT NULL DEFAULT 0.75,
        scope               weight_scope NOT NULL DEFAULT 'global',
        tenant_id           UUID,
        source_episode_ids  UUID[] NOT NULL DEFAULT '{}',
        use_count           INTEGER NOT NULL DEFAULT 0,
        success_count       INTEGER NOT NULL DEFAULT 0,
        archived            BOOLEAN NOT NULL DEFAULT false,
        created_at          TIMESTAMPTZ DEFAULT now(),
        last_applied_at     TIMESTAMPTZ,
        updated_at          TIMESTAMPTZ DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_parametric_weights_domain    ON parametric_weights(domain) WHERE archived = false;
    `);
    await queryRunner.query(`
      CREATE INDEX idx_parametric_weights_tenant    ON parametric_weights(tenant_id) WHERE scope = 'tenant';
    `);
    await queryRunner.query(`
      CREATE INDEX idx_parametric_weights_confidence ON parametric_weights(confidence DESC) WHERE archived = false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE parametric_weights;`);
    await queryRunner.query(`DROP TYPE weight_effect;`);
    await queryRunner.query(`DROP TYPE weight_scope;`);
  }
}
