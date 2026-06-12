import { MigrationInterface, QueryRunner } from 'typeorm';

export class TceTaskGoalidNullable1779851800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tce_tasks"
      ALTER COLUMN "goalId" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "tce_tasks" SET "goalId" = '' WHERE "goalId" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tce_tasks"
      ALTER COLUMN "goalId" SET NOT NULL
    `);
  }
}
