import { sql } from "drizzle-orm";
import type { MigrationArgs } from "@drepkovsky/drizzle-migrations";

export async function up({ db }: MigrationArgs<"postgresql">): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."task_status" AS ENUM('todo', 'in_progress', 'done');
    CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high');

    CREATE TABLE "tasks" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "title" text NOT NULL,
      "description" text,
      "status" "task_status" DEFAULT 'todo' NOT NULL,
      "priority" "task_priority" DEFAULT 'medium' NOT NULL,
      "project_id" uuid NOT NULL,
      "creator_id" uuid NOT NULL,
      "assignee_id" uuid,
      "due_date" date,
      "created_at" timestamp(3) DEFAULT now() NOT NULL,
      "updated_at" timestamp(3) DEFAULT now() NOT NULL
    );

    ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk"
      FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
      ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "tasks" ADD CONSTRAINT "tasks_creator_id_users_id_fk"
      FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id")
      ON DELETE no action ON UPDATE no action;
    ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_users_id_fk"
      FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id")
      ON DELETE no action ON UPDATE no action;

    CREATE INDEX "tasks_project_id_idx" ON "tasks" USING btree ("project_id");
    CREATE INDEX "tasks_creator_id_idx" ON "tasks" USING btree ("creator_id");
    CREATE INDEX "tasks_assignee_id_idx" ON "tasks" USING btree ("assignee_id");
    CREATE INDEX "tasks_project_id_status_idx" ON "tasks" USING btree ("project_id","status");
    CREATE INDEX "tasks_project_id_assignee_id_idx" ON "tasks" USING btree ("project_id","assignee_id");
  `);
}

export async function down({ db }: MigrationArgs<"postgresql">): Promise<void> {
  await db.execute(sql`
    DROP TABLE "tasks" CASCADE;
    DROP TYPE "public"."task_priority";
    DROP TYPE "public"."task_status";
  `);
}
