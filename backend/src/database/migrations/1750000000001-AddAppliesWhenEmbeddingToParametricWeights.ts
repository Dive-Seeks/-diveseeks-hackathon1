import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppliesWhenEmbeddingToParametricWeights1750000000001 implements MigrationInterface {
  name = 'AddAppliesWhenEmbeddingToParametricWeights1750000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "parametric_weights" ADD "applies_when_embedding" vector(768)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "parametric_weights" DROP COLUMN "applies_when_embedding"`,
    );
  }
}
