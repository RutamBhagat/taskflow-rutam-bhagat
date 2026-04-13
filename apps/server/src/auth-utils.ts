import { jwt } from "@elysiajs/jwt";
import { env } from "@taskflow-elysia/env/server";
import { t } from "elysia";

export const jwtSchema = t.Object({
  user_id: t.String(),
  email: t.String(),
  exp: t.Number(),
});

export function createJwtPlugin() {
  return jwt({
    name: "jwt",
    secret: env.JWT_SECRET,
    schema: jwtSchema,
  });
}

export function getBearerToken(authorization?: string) {
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();

  return token || null;
}

type JwtNamespace = {
  verify: (token: string) => Promise<unknown | false>;
};

export async function getCurrentUserId(jwtNamespace: JwtNamespace, authorization?: string) {
  const token = getBearerToken(authorization);

  if (!token) {
    return null;
  }

  const payload = await jwtNamespace.verify(token);

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const userId = (payload as { user_id?: unknown }).user_id;

  return typeof userId === "string" ? userId : null;
}
