import { cors } from "@elysiajs/cors";
import { db } from "@taskflow-elysia/db";
import { env } from "@taskflow-elysia/env/server";
import { Elysia } from "elysia";
import {
  getValidationFields,
  isForbidden,
  isNotFound,
  isUnauthorized,
  logger,
} from "./lib";

export const app = new Elysia()
  .use(
    cors({
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST", "OPTIONS"],
    }),
  )
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 400;

      return {
        error: "validation failed",
        fields: getValidationFields(error),
      };
    }

    if (isUnauthorized(code)) {
      set.status = 401;

      return { error: "unauthorized" };
    }

    if (isForbidden(code)) {
      set.status = 403;

      return { error: "forbidden" };
    }

    if (isNotFound(code)) {
      set.status = 404;

      return { error: "not found" };
    }

    set.status = 500;

    return { error: "internal server error" };
  })
  .onAfterResponse(({ request, set }) => {
    logger.info({
      event: "request_completed",
      method: request.method,
      path: new URL(request.url).pathname,
      status: set.status ?? 200,
    }, "request completed");
  })
  .get("/", () => ({ ok: true }))
  .get("/health/db", async ({ set }) => {
    try {
      await db.execute("select 1");

      return { status: "ok" };
    } catch {
      set.status = 503;

      return { status: "error" };
    }
  });
