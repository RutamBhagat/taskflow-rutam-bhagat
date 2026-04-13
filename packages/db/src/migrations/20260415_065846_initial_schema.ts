import { sql } from "drizzle-orm";
import type { MigrationArgs } from "@drepkovsky/drizzle-migrations";

export async function up({
  db,
}: MigrationArgs<"postgresql">): Promise<void> {
  await db.execute(sql`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE "users" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "name" text NOT NULL,
      "email" text NOT NULL,
      "password" text NOT NULL,
      "created_at" timestamp(3) DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  `);
}

export async function down({
  db,
}: MigrationArgs<"postgresql">): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "users_email_idx";
    DROP TABLE IF EXISTS "users";
  `);
}
