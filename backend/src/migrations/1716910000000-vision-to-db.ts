import { MigrationInterface, QueryRunner } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

export class VisionToDb1716910000000 implements MigrationInterface {
  name = 'VisionToDb1716910000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Schema generation (production won't have synchronize: true)
    await queryRunner.query(
      `ALTER TABLE "diveseeks_project" ADD "visionFile" jsonb`,
    );

    // Backfill: read existing vision JSON files into DB column
    const memoryDir = path.join(process.cwd(), 'memory', 'projects');

    if (fs.existsSync(memoryDir)) {
      const files = fs
        .readdirSync(memoryDir)
        .filter((f) => f.endsWith('-vision.json'));
      for (const file of files) {
        const projectId = file.replace('-vision.json', '');
        try {
          const vision = JSON.parse(
            fs.readFileSync(path.join(memoryDir, file), 'utf-8'),
          );

          await queryRunner.query(
            `UPDATE "diveseeks_project" SET "visionFile" = $1 WHERE "id" = $2`,
            [vision, projectId],
          );
        } catch (error) {
          console.warn(
            `Failed to backfill vision for project ${projectId}`,
            error,
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "diveseeks_project" DROP COLUMN "visionFile"`,
    );
  }
}
