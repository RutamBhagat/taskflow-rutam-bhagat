import { db, desc, eq, inArray, or, and, schema } from "@taskflow-elysia/db";
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
  .get(
    "/:id",
    async ({ headers, jwt, params, set }) => {
      const currentUserId = await getCurrentUserId(jwt, headers.authorization);

      if (!currentUserId) {
        set.status = 401;

        return { error: "unauthorized" };
      }

      const [project] = await db
        .select({
          id: schema.projects.id,
          name: schema.projects.name,
          description: schema.projects.description,
          ownerId: schema.projects.ownerId,
        })
        .from(schema.projects)
        .where(eq(schema.projects.id, params.id))
        .limit(1);

      if (!project) {
        set.status = 404;

        return { error: "not found" };
      }

      const [assignedTask] = await db
        .select({ id: schema.tasks.id })
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.projectId, params.id), eq(schema.tasks.assigneeId, currentUserId)),
        )
        .limit(1);

      if (project.ownerId !== currentUserId && !assignedTask) {
        set.status = 403;

        return { error: "forbidden" };
      }

      const tasks = await db
        .select({
          id: schema.tasks.id,
          title: schema.tasks.title,
          status: schema.tasks.status,
          priority: schema.tasks.priority,
          assigneeId: schema.tasks.assigneeId,
          dueDate: schema.tasks.dueDate,
          createdAt: schema.tasks.createdAt,
          updatedAt: schema.tasks.updatedAt,
        })
        .from(schema.tasks)
        .where(eq(schema.tasks.projectId, params.id))
        .orderBy(desc(schema.tasks.createdAt));

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        owner_id: project.ownerId,
        tasks: tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          assignee_id: task.assigneeId,
          due_date: task.dueDate,
          created_at: task.createdAt,
          updated_at: task.updatedAt,
        })),
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .get(
    "/:id/tasks",
    async ({ headers, jwt, params, query, set }) => {
      const currentUserId = await getCurrentUserId(jwt, headers.authorization);

      if (!currentUserId) {
        set.status = 401;

        return { error: "unauthorized" };
      }

      const [project] = await db
        .select({
          id: schema.projects.id,
          ownerId: schema.projects.ownerId,
        })
        .from(schema.projects)
        .where(eq(schema.projects.id, params.id))
        .limit(1);

      if (!project) {
        set.status = 404;

        return { error: "not found" };
      }

      const [assignedTask] = await db
        .select({ id: schema.tasks.id })
        .from(schema.tasks)
        .where(
          and(eq(schema.tasks.projectId, params.id), eq(schema.tasks.assigneeId, currentUserId)),
        )
        .limit(1);

      if (project.ownerId !== currentUserId && !assignedTask) {
        set.status = 403;

        return { error: "forbidden" };
      }

      const filters = [eq(schema.tasks.projectId, params.id)];

      if (query.status !== undefined) {
        filters.push(eq(schema.tasks.status, query.status));
      }

      if (query.assignee !== undefined) {
        filters.push(eq(schema.tasks.assigneeId, query.assignee));
      }

      const tasks = await db
        .select({
          id: schema.tasks.id,
          title: schema.tasks.title,
          status: schema.tasks.status,
          priority: schema.tasks.priority,
          assigneeId: schema.tasks.assigneeId,
          dueDate: schema.tasks.dueDate,
          createdAt: schema.tasks.createdAt,
          updatedAt: schema.tasks.updatedAt,
        })
        .from(schema.tasks)
        .where(and(...filters))
        .orderBy(desc(schema.tasks.createdAt));

      return {
        tasks: tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          assignee_id: task.assigneeId,
          due_date: task.dueDate,
          created_at: task.createdAt,
          updated_at: task.updatedAt,
        })),
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        status: t.Optional(
          t.Union([t.Literal("todo"), t.Literal("in_progress"), t.Literal("done")]),
        ),
        assignee: t.Optional(t.String({ minLength: 1 })),
      }),
    },
  )
  .post(
    "/:id/tasks",
    async ({ body, headers, jwt, params, set }) => {
      const currentUserId = await getCurrentUserId(jwt, headers.authorization);

      if (!currentUserId) {
        set.status = 401;

        return { error: "unauthorized" };
      }

      const [project] = await db
        .select({
          id: schema.projects.id,
          ownerId: schema.projects.ownerId,
        })
        .from(schema.projects)
        .where(eq(schema.projects.id, params.id))
        .limit(1);

      if (!project) {
        set.status = 404;

        return { error: "not found" };
      }

      if (project.ownerId !== currentUserId) {
        set.status = 403;

        return { error: "forbidden" };
      }

      if (body.assignee_id !== undefined) {
        const [assignee] = await db
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(eq(schema.users.id, body.assignee_id))
          .limit(1);

        if (!assignee) {
          set.status = 400;

          return {
            error: "validation failed",
            fields: {
              assignee_id: "does not exist",
            },
          };
        }
      }

      const [task] = await db
        .insert(schema.tasks)
        .values({
          title: body.title,
          description: body.description,
          status: body.status,
          priority: body.priority,
          projectId: params.id,
          creatorId: currentUserId,
          assigneeId: body.assignee_id,
          dueDate: body.due_date ? new Date(body.due_date) : undefined,
        })
        .returning({
          id: schema.tasks.id,
          title: schema.tasks.title,
          description: schema.tasks.description,
          status: schema.tasks.status,
          priority: schema.tasks.priority,
          projectId: schema.tasks.projectId,
          assigneeId: schema.tasks.assigneeId,
          dueDate: schema.tasks.dueDate,
          createdAt: schema.tasks.createdAt,
          updatedAt: schema.tasks.updatedAt,
        });

      if (!task) {
        set.status = 500;

        return { error: "task not created" };
      }

      set.status = 201;

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        project_id: task.projectId,
        assignee_id: task.assigneeId,
        due_date: task.dueDate,
        created_at: task.createdAt,
        updated_at: task.updatedAt,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        title: t.String({ minLength: 1 }),
        description: t.Optional(t.String()),
        status: t.Optional(
          t.Union([t.Literal("todo"), t.Literal("in_progress"), t.Literal("done")]),
        ),
        priority: t.Optional(t.Union([t.Literal("low"), t.Literal("medium"), t.Literal("high")])),
        assignee_id: t.Optional(t.String({ format: "uuid" })),
        due_date: t.Optional(t.String({ format: "date" })),
      }),
    },
  )
  .patch(
    "/:id",
    async ({ body, headers, jwt, params, set }) => {
      const currentUserId = await getCurrentUserId(jwt, headers.authorization);

      if (!currentUserId) {
        set.status = 401;

        return { error: "unauthorized" };
      }

      const [project] = await db
        .select({
          id: schema.projects.id,
          ownerId: schema.projects.ownerId,
        })
        .from(schema.projects)
        .where(eq(schema.projects.id, params.id))
        .limit(1);

      if (!project) {
        set.status = 404;

        return { error: "not found" };
      }

      if (project.ownerId !== currentUserId) {
        set.status = 403;

        return { error: "forbidden" };
      }

      if (body.name === undefined && body.description === undefined) {
        set.status = 400;

        return {
          error: "validation failed",
          fields: {
            body: "at least one field is required",
          },
        };
      }

      const updates: {
        name?: string;
        description?: string;
      } = {};

      if (body.name !== undefined) {
        updates.name = body.name;
      }

      if (body.description !== undefined) {
        updates.description = body.description;
      }

      const [updatedProject] = await db
        .update(schema.projects)
        .set(updates)
        .where(eq(schema.projects.id, params.id))
        .returning({
          id: schema.projects.id,
          name: schema.projects.name,
          description: schema.projects.description,
          ownerId: schema.projects.ownerId,
          createdAt: schema.projects.createdAt,
          updatedAt: schema.projects.updatedAt,
        });

      if (!updatedProject) {
        set.status = 500;

        return { error: "project not updated" };
      }

      return {
        id: updatedProject.id,
        name: updatedProject.name,
        description: updatedProject.description,
        owner_id: updatedProject.ownerId,
        created_at: updatedProject.createdAt,
        updated_at: updatedProject.updatedAt,
      };
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
      }),
    },
  )
  .delete(
    "/:id",
    async ({ headers, jwt, params, set }) => {
      const currentUserId = await getCurrentUserId(jwt, headers.authorization);

      if (!currentUserId) {
        set.status = 401;

        return { error: "unauthorized" };
      }

      const [project] = await db
        .select({
          id: schema.projects.id,
          ownerId: schema.projects.ownerId,
        })
        .from(schema.projects)
        .where(eq(schema.projects.id, params.id))
        .limit(1);

      if (!project) {
        set.status = 404;

        return { error: "not found" };
      }

      if (project.ownerId !== currentUserId) {
        set.status = 403;

        return { error: "forbidden" };
      }

      const [deletedProject] = await db
        .delete(schema.projects)
        .where(eq(schema.projects.id, params.id))
        .returning({
          id: schema.projects.id,
        });

      if (!deletedProject) {
        set.status = 500;

        return { error: "project not deleted" };
      }

      set.status = 204;

      return;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
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
