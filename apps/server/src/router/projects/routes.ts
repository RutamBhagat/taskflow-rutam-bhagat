import { db, desc, eq, inArray, or, schema } from "@taskflow-elysia/db";
import { Elysia, t } from "elysia";
import { app } from "../../app";
import { createJwtPlugin, getCurrentUserId } from "../auth/auth-utils";

const projectRoutes = new Elysia({ prefix: "/projects" })
  .use(createJwtPlugin())
  .get("/", async ({ headers, jwt, set }) => {
    const currentUserId = await getCurrentUserId(jwt, headers.authorization);

    if (!currentUserId) {
      set.status = 401;

      return { error: "unauthorized" };
    }

    const assignedProjectIds = db
      .select({
        projectId: schema.tasks.projectId,
      })
      .from(schema.tasks)
      .where(eq(schema.tasks.assigneeId, currentUserId));

    const projects = await db
      .select({
        id: schema.projects.id,
        name: schema.projects.name,
        description: schema.projects.description,
        ownerId: schema.projects.ownerId,
        createdAt: schema.projects.createdAt,
        updatedAt: schema.projects.updatedAt,
      })
      .from(schema.projects)
      .where(
        or(
          eq(schema.projects.ownerId, currentUserId),
          inArray(schema.projects.id, assignedProjectIds),
        ),
      )
      .orderBy(desc(schema.projects.createdAt));

    return { projects };
  })
  .post(
    "/",
    async ({ body, headers, jwt, set }) => {
      const currentUserId = await getCurrentUserId(jwt, headers.authorization);

      if (!currentUserId) {
        set.status = 401;

        return { error: "unauthorized" };
      }

      const [project] = await db
        .insert(schema.projects)
        .values({
          name: body.name,
          description: body.description,
          ownerId: currentUserId,
        })
        .returning({
          id: schema.projects.id,
          name: schema.projects.name,
          description: schema.projects.description,
          ownerId: schema.projects.ownerId,
          createdAt: schema.projects.createdAt,
          updatedAt: schema.projects.updatedAt,
        });

      if (!project) {
        set.status = 500;

        return { error: "project not created" };
      }

      set.status = 201;

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        owner_id: project.ownerId,
        created_at: project.createdAt,
        updated_at: project.updatedAt,
      };
    },
    {
      body: t.Object({
        name: t.String(),
        description: t.Optional(t.String()),
      }),
    },
  );

app.use(projectRoutes);
