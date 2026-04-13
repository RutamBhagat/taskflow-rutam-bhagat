import { db, desc, eq, inArray, or, schema } from "@taskflow-elysia/db";
import { Elysia } from "elysia";
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
  });

app.use(projectRoutes);
