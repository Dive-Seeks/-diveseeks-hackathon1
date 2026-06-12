import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTceTaskTenantSession1779851664000 implements MigrationInterface {
  name = 'AddTceTaskTenantSession1779851664000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tce_tasks" ADD "tenantId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "tce_tasks" ADD "sessionId" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tce_tasks" DROP COLUMN "sessionId"`);
    await queryRunner.query(`ALTER TABLE "tce_tasks" DROP COLUMN "tenantId"`);
  }
}
