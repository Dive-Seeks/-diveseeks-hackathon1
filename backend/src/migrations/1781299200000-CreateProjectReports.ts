import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectReports1781299200000 implements MigrationInterface {
  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      CREATE TABLE IF NOT EXISTS project_reports (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id VARCHAR NOT NULL,
        project_id VARCHAR NOT NULL,
        report_markdown TEXT,
        tsv_data TEXT,
        status VARCHAR NOT NULL DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    await qr.query(
      `CREATE INDEX IF NOT EXISTS idx_project_reports_tenant_project ON project_reports(tenant_id, project_id)`,
    );
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS project_reports`);
  }
}
