import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserChatMessages1750000000007 implements MigrationInterface {
  name = 'CreateUserChatMessages1750000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_chat_messages_team_enum" AS ENUM('coding', 'general', 'research')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_chat_messages_role_enum" AS ENUM('user', 'assistant')`,
    );
    await queryRunner.query(`
      CREATE TABLE "user_chat_messages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "projectId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "team" "public"."user_chat_messages_team_enum" NOT NULL,
        "role" "public"."user_chat_messages_role_enum" NOT NULL,
        "content" text NOT NULL,
        "specialistId" character varying,
        "sessionId" uuid,
        "tokenCount" integer NOT NULL DEFAULT 0,
        "dreamedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_chat_messages" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_chat_messages_tenantId" ON "user_chat_messages" ("tenantId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_chat_messages_tenantId_projectId_createdAt" ON "user_chat_messages" ("tenantId", "projectId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_chat_messages_tenantId_userId" ON "user_chat_messages" ("tenantId", "userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_chat_messages"`);
    await queryRunner.query(
      `DROP TYPE "public"."user_chat_messages_role_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."user_chat_messages_team_enum"`,
    );
  }
}
