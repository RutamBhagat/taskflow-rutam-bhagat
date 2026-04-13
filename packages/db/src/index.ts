import { env } from "@taskflow-elysia/env/server";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export function createDb() {
  return drizzle(env.DATABASE_URL, { schema, casing: "snake_case" });
}

export const db = createDb();
