import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnifiedTaskPrdLoop1716200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. team_registry
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS team_registry (
        team_name varchar(20) PRIMARY KEY,
        display_name varchar(60) NOT NULL,
        default_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
        max_iterations int NOT NULL DEFAULT 5,
        iteration_timeout_seconds int NOT NULL DEFAULT 180,
        created_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    // 2. flag_registry
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS flag_registry (
        flag_key varchar(80) PRIMARY KEY,
        team varchar(20) NOT NULL,
        description text NOT NULL,
        evidence_shape jsonb NOT NULL DEFAULT '{}'::jsonb,
        evaluator_id varchar(80) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    // 3. Rename + extend prd_feature_maps → task_prd_feature_maps
    const featureMapExists = await queryRunner.hasTable('prd_feature_maps');
    if (featureMapExists) {
      await queryRunner.query(
        `ALTER TABLE prd_feature_maps RENAME TO task_prd_feature_maps`,
      );
    } else {
      await queryRunner.query(`
        CREATE TABLE task_prd_feature_maps (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id uuid NOT NULL,
          task_session_id uuid NOT NULL,
          task_slug varchar(120) NOT NULL,
          goal text NOT NULL,
          starting_route varchar(200),
          features jsonb NOT NULL,
          generated_from text NOT NULL,
          human_notes text,
          version int NOT NULL DEFAULT 1,
          created_at timestamptz NOT NULL DEFAULT NOW(),
          updated_at timestamptz NOT NULL DEFAULT NOW()
        )
      `);
    }

    await queryRunner.query(`
      ALTER TABLE task_prd_feature_maps
        ADD COLUMN IF NOT EXISTS team varchar(20) NOT NULL DEFAULT 'coding',
        ADD COLUMN IF NOT EXISTS goal_id varchar(20),
        ADD COLUMN IF NOT EXISTS goal_title text,
        ADD COLUMN IF NOT EXISTS goal_description text,
        ADD COLUMN IF NOT EXISTS total_requirements int NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS satisfied_requirements int NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS current_iteration int NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_iteration_at timestamptz,
        ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'pending'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_task_prd_feature_maps_tenant_session
        ON task_prd_feature_maps (tenant_id, task_session_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_task_prd_feature_maps_status_iter
        ON task_prd_feature_maps (status, last_iteration_at)
    `);

    // 4. Rename + extend test_run_requirements → task_prd_requirements
    const reqExists = await queryRunner.hasTable('test_run_requirements');
    if (reqExists) {
      await queryRunner.query(
        `ALTER TABLE test_run_requirements RENAME TO task_prd_requirements`,
      );
      await queryRunner.query(`
        ALTER TABLE task_prd_requirements
          ADD COLUMN IF NOT EXISTS feature_map_id uuid,
          ADD COLUMN IF NOT EXISTS flags jsonb NOT NULL DEFAULT '{}'::jsonb,
          ADD COLUMN IF NOT EXISTS satisfied boolean NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS iteration_number int NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS evaluator_name varchar(200),
          ADD COLUMN IF NOT EXISTS evidence jsonb
      `);
      // Backfill: feature_map_id from existing prd_feature_map_id; satisfied from status
      await queryRunner.query(`
        UPDATE task_prd_requirements
        SET feature_map_id = prd_feature_map_id
        WHERE feature_map_id IS NULL AND prd_feature_map_id IS NOT NULL
      `);
      await queryRunner.query(`
        UPDATE task_prd_requirements
        SET satisfied = (status IN ('pass', 'human_pass'))
      `);
      // Now make feature_map_id NOT NULL
      await queryRunner.query(`
        ALTER TABLE task_prd_requirements ALTER COLUMN feature_map_id SET NOT NULL
      `);
    } else {
      await queryRunner.query(`
        CREATE TABLE task_prd_requirements (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id uuid NOT NULL,
          feature_map_id uuid NOT NULL,
          task_session_id uuid NOT NULL,
          requirement_id varchar(20) NOT NULL,
          requirement_text text NOT NULL,
          flags jsonb NOT NULL DEFAULT '{}'::jsonb,
          satisfied boolean NOT NULL DEFAULT false,
          status varchar(20) NOT NULL DEFAULT 'pending',
          evidence jsonb,
          error_message text,
          iteration_number int NOT NULL DEFAULT 0,
          evaluator_name varchar(200),
          human_note text,
          spec_file varchar(200),
          screenshot_path varchar(300),
          dom_event_log jsonb,
          attr_change_log jsonb,
          aria_snapshots jsonb,
          run_number int NOT NULL DEFAULT 1,
          created_at timestamptz NOT NULL DEFAULT NOW()
        )
      `);
    }

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_task_prd_requirements_map_req_iter
        ON task_prd_requirements (feature_map_id, requirement_id, iteration_number)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_task_prd_requirements_tenant_session
        ON task_prd_requirements (tenant_id, task_session_id)
    `);

    // 5. Seed team_registry
    await queryRunner.query(`
      INSERT INTO team_registry (team_name, display_name, max_iterations, iteration_timeout_seconds)
      VALUES
        ('coding', 'Coding', 5, 180),
        ('general', 'General', 3, 60),
        ('research', 'Research', 8, 240)
      ON CONFLICT (team_name) DO NOTHING
    `);

    // flag_registry seeded at boot by team bootstrap services (Task 3)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS flag_registry`);
    await queryRunner.query(`DROP TABLE IF EXISTS team_registry`);
    // Note: leave task_prd_* tables alone in down() — original Sage names cannot
    // be safely restored without data loss. Migration is forward-only.
  }
}
