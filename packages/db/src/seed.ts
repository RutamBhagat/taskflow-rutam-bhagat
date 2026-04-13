import { eq, or, schema } from "./index";
import { db } from "./index";

const seededUserEmail = "test@example.com";
const seededUserPassword = "password123";
const seededUserId = "11111111-1111-1111-1111-111111111111";
const seededProjectId = "22222222-2222-2222-2222-222222222222";

const seededTasks = [
  {
    id: "33333333-3333-3333-3333-333333333333",
    title: "Seed task - todo",
    status: "todo" as const,
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    title: "Seed task - in progress",
    status: "in_progress" as const,
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    title: "Seed task - done",
    status: "done" as const,
  },
];

export async function seedDatabase() {
  const password = await Bun.password.hash(seededUserPassword, {
    algorithm: "bcrypt",
    cost: 12,
  });

  const [matchedUser] = await db
    .select({
      id: schema.users.id,
    })
    .from(schema.users)
    .where(
      or(
        eq(schema.users.email, seededUserEmail),
        eq(schema.users.id, seededUserId),
      ),
    )
    .limit(1);

  if (!matchedUser) {
    await db
      .insert(schema.users)
      .values({
        id: seededUserId,
        name: "Seed User",
        email: seededUserEmail,
        password,
      })
      .onConflictDoNothing();
  }

  const [seededUser] = await db
    .select({
      id: schema.users.id,
    })
    .from(schema.users)
    .where(
      or(
        eq(schema.users.email, seededUserEmail),
        eq(schema.users.id, seededUserId),
      ),
    )
    .limit(1);

  if (!seededUser) {
    throw new Error("Seed user was not found after seeding");
  }

  await db
    .insert(schema.projects)
    .values({
      id: seededProjectId,
      name: "Seed Project",
      description: "Project created during bootstrap seeding",
      ownerId: seededUser.id,
    })
    .onConflictDoNothing();

  for (const seededTask of seededTasks) {
    await db
      .insert(schema.tasks)
      .values({
        id: seededTask.id,
        title: seededTask.title,
        description: `Seed data for ${seededTask.status}`,
        status: seededTask.status,
        priority: "medium",
        projectId: seededProjectId,
        creatorId: seededUser.id,
        assigneeId: seededUser.id,
        dueDate: null,
      })
      .onConflictDoNothing();
  }
}

if (import.meta.main) {
  await seedDatabase();
}
