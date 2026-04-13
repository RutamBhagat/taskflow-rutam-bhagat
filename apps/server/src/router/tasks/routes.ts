import { db, eq, schema } from "@taskflow-elysia/db";
import { Elysia, t } from "elysia";
import { app } from "../../app";
import { createJwtPlugin, getCurrentUserId } from "../auth/auth-utils";

const taskRoutes = new Elysia({ prefix: "/tasks" }).use(createJwtPlugin()).patch(
  "/:id",
  async ({ body, headers, jwt, params, set }) => {
    const currentUserId = await getCurrentUserId(jwt, headers.authorization);

    if (!currentUserId) {
      set.status = 401;

      return { error: "unauthorized" };
    }

    const [task] = await db
      .select({
        id: schema.tasks.id,
        projectOwnerId: schema.projects.ownerId,
      })
      .from(schema.tasks)
      .innerJoin(schema.projects, eq(schema.tasks.projectId, schema.projects.id))
      .where(eq(schema.tasks.id, params.id))
      .limit(1);

    if (!task) {
      set.status = 404;

      return { error: "not found" };
    }

    if (task.projectOwnerId !== currentUserId) {
      set.status = 403;

      return { error: "forbidden" };
    }

    if (body.title.trim() === "") {
      set.status = 400;

      return {
        error: "validation failed",
        fields: {
          title: "is required",
        },
      };
    }

    if (body.assignee_id !== undefined && body.assignee_id !== null) {
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

    const updates: {
      title: string;
      description?: string | null;
      status?: "todo" | "in_progress" | "done";
      priority?: "low" | "medium" | "high";
      assigneeId?: string | null;
      dueDate?: Date | null;
    } = {
      title: body.title,
    };

    if (body.description !== undefined) {
      updates.description = body.description;
    }

    if (body.status !== undefined) {
      updates.status = body.status;
    }

    if (body.priority !== undefined) {
      updates.priority = body.priority;
    }

    if (body.assignee_id !== undefined) {
      updates.assigneeId = body.assignee_id;
    }

    if (body.due_date !== undefined) {
      updates.dueDate = body.due_date === null ? null : new Date(body.due_date);
    }

    const [updatedTask] = await db
      .update(schema.tasks)
      .set(updates)
      .where(eq(schema.tasks.id, params.id))
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

    if (!updatedTask) {
      set.status = 500;

      return { error: "task not updated" };
    }

    return {
      id: updatedTask.id,
      title: updatedTask.title,
      description: updatedTask.description,
      status: updatedTask.status,
      priority: updatedTask.priority,
      project_id: updatedTask.projectId,
      assignee_id: updatedTask.assigneeId,
      due_date: updatedTask.dueDate ? updatedTask.dueDate.toISOString().slice(0, 10) : null,
      created_at: updatedTask.createdAt.toISOString(),
      updated_at: updatedTask.updatedAt.toISOString(),
    };
  },
  {
    params: t.Object({
      id: t.String(),
    }),
    body: t.Object({
      title: t.String(),
      description: t.Optional(t.Nullable(t.String())),
      status: t.Optional(t.Union([t.Literal("todo"), t.Literal("in_progress"), t.Literal("done")])),
      priority: t.Optional(t.Union([t.Literal("low"), t.Literal("medium"), t.Literal("high")])),
      assignee_id: t.Optional(t.Nullable(t.String({ format: "uuid" }))),
      due_date: t.Optional(t.Nullable(t.String({ format: "date" }))),
    }),
  },
);

app.use(taskRoutes);
