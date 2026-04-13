import { env } from "@taskflow-elysia/env/server";
import pino from "pino";

export const logger = pino({
  level: env.NODE_ENV === "development" ? "debug" : "info",
});
