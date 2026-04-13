import dotenv from "dotenv";
import { type DrizzleMigrationsConfig } from "@drepkovsky/drizzle-migrations";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const rootEnvPath = resolve(currentDir, "../../.env");

dotenv.config({ path: rootEnvPath });

const config: DrizzleMigrationsConfig = {
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
  migrations: {
    schema: "public",
    table: "drizzle_migrations",
  },
  getMigrator: async () => {
    const migrationClient = postgres(process.env.DATABASE_URL || "", {
      max: 1,
    });

    return drizzle(migrationClient);
  },
};

export default config;
