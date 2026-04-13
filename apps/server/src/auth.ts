import { jwt } from "@elysiajs/jwt";
import { db, eq, schema } from "@taskflow-elysia/db";
import { env } from "@taskflow-elysia/env/server";
import { Elysia, t } from "elysia";
import { app } from "./app";
import { jwtSchema } from "./auth-utils";

function isUniqueViolation(error: unknown) {
  const code =
    typeof error === "object" && error !== null ? (error as { code?: string }).code : undefined;

  return code === "23505";
}

function duplicateEmailError() {
  return {
    error: "validation failed",
    fields: {
      email: "already exists",
    },
  };
}

const authRoutes = new Elysia({ prefix: "/auth" })
  .use(
    jwt({
      name: "jwt",
      secret: env.JWT_SECRET,
      schema: jwtSchema,
    }),
  )
  .post(
    "/register",
    async ({ body, jwt, set }) => {
      const [existingUser] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, body.email))
        .limit(1);

      if (existingUser) {
        set.status = 400;

        return duplicateEmailError();
      }

      try {
        const password = await Bun.password.hash(body.password, {
          algorithm: "bcrypt",
          cost: 12,
        });

        const [user] = await db
          .insert(schema.users)
          .values({
            name: body.name,
            email: body.email,
            password,
          })
          .returning({
            id: schema.users.id,
            name: schema.users.name,
            email: schema.users.email,
            createdAt: schema.users.createdAt,
            updatedAt: schema.users.updatedAt,
          });

        if (!user) {
          return {
            error: "user not created",
          };
        }

        const token = await jwt.sign({
          user_id: user.id,
          email: user.email,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
        });

        set.status = 201;

        return {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        };
      } catch (error) {
        if (isUniqueViolation(error)) {
          set.status = 400;

          return duplicateEmailError();
        }

        throw error;
      }
    },
    {
      body: t.Object({
        name: t.String(),
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
    },
  )
  .post(
    "/login",
    async ({ body, jwt, set }) => {
      const [user] = await db
        .select({
          id: schema.users.id,
          email: schema.users.email,
          password: schema.users.password,
        })
        .from(schema.users)
        .where(eq(schema.users.email, body.email))
        .limit(1);

      if (!user) {
        set.status = 401;

        return { error: "unauthorized" };
      }

      const passwordIsValid = await Bun.password.verify(body.password, user.password);

      if (!passwordIsValid) {
        set.status = 401;

        return { error: "unauthorized" };
      }

      const token = await jwt.sign({
        user_id: user.id,
        email: user.email,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
      });

      return { token };
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
    },
  );

app.use(authRoutes);
