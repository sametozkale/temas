import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * RLS smoke test against the local Supabase Postgres.
 * Verifies that `withUserContext` really scopes queries to the caller's
 * workspaces (docs/02 §3, docs/03 §8). Skips when DATABASE_URL is missing.
 */
const url = process.env.DATABASE_URL;
const describeDb = url ? describe : describe.skip;

/** Drizzle wraps driver errors ("Failed query: …"); the Postgres message is on `cause`. */
async function expectRlsViolation(promise: Promise<unknown>) {
  let message = "";
  try {
    await promise;
  } catch (err) {
    const e = err as { message?: string; cause?: { message?: string } };
    message = e.cause?.message ?? e.message ?? "";
  }
  expect(message).toMatch(/row-level security/);
}

describeDb("RLS via withUserContext", () => {
  // Lazy imports so the suite can be skipped without a DB connection.
  let db: typeof import("./index").db;
  let withUserContext: typeof import("./index").withUserContext;
  let schema: typeof import("./schema");

  const userA = "aaaaaaaa-0000-4000-8000-00000000000a";
  const userB = "bbbbbbbb-0000-4000-8000-00000000000b";
  let wsA = "";
  let wsB = "";

  async function createAuthUser(id: string, email: string) {
    await db.execute(sql`
      insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
      values (${id}::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${email},
              ${JSON.stringify({ full_name: email })}::jsonb, '{}'::jsonb, now(), now())
      on conflict (id) do nothing
    `);
  }

  beforeAll(async () => {
    ({ db, withUserContext } = await import("./index"));
    schema = await import("./schema");

    await db.execute(sql`
      delete from public.workspaces
      where slug like 'rls-a-%' or slug like 'rls-b-%'
    `);
    await db.execute(sql`
      delete from public.tasks
      where assignee_id in (
        ${userA}::uuid, ${userB}::uuid,
        'cccccccc-0000-4000-8000-00000000000c'::uuid,
        'dddddddd-0000-4000-8000-00000000000d'::uuid,
        'eeeeeeee-0000-4000-8000-00000000000e'::uuid
      )
         or created_by in (
        ${userA}::uuid, ${userB}::uuid,
        'cccccccc-0000-4000-8000-00000000000c'::uuid,
        'dddddddd-0000-4000-8000-00000000000d'::uuid,
        'eeeeeeee-0000-4000-8000-00000000000e'::uuid
      )
         or user_id in (
        ${userA}::uuid, ${userB}::uuid,
        'cccccccc-0000-4000-8000-00000000000c'::uuid,
        'dddddddd-0000-4000-8000-00000000000d'::uuid,
        'eeeeeeee-0000-4000-8000-00000000000e'::uuid
      )
    `);
    await db.execute(sql`
      delete from auth.users
      where id in (
        'cccccccc-0000-4000-8000-00000000000c'::uuid,
        'dddddddd-0000-4000-8000-00000000000d'::uuid,
        'eeeeeeee-0000-4000-8000-00000000000e'::uuid
      )
    `);

    await createAuthUser(userA, "rls-a@test.temas");
    await createAuthUser(userB, "rls-b@test.temas");

    const [a] = await db
      .insert(schema.workspaces)
      .values({ name: "RLS A", slug: `rls-a-${Date.now()}` })
      .returning({ id: schema.workspaces.id });
    const [b] = await db
      .insert(schema.workspaces)
      .values({ name: "RLS B", slug: `rls-b-${Date.now()}` })
      .returning({ id: schema.workspaces.id });
    wsA = a!.id;
    wsB = b!.id;

    await db.insert(schema.workspaceMembers).values([
      { workspaceId: wsA, userId: userA, role: "owner" },
      { workspaceId: wsB, userId: userB, role: "assistant" },
    ]);
  });

  afterAll(async () => {
    // Tasks reference auth.users with ON DELETE restrict.
    await db.execute(sql`
      delete from public.tasks
      where assignee_id in (${userA}::uuid, ${userB}::uuid)
         or created_by in (${userA}::uuid, ${userB}::uuid)
         or user_id in (${userA}::uuid, ${userB}::uuid)
    `);
    // Cascades to profiles, memberships, contacts, activity_log.
    await db.execute(
      sql`delete from auth.users where id in (${userA}::uuid, ${userB}::uuid)`,
    );
    await db.delete(schema.workspaces).where(eq(schema.workspaces.id, wsA));
    await db.delete(schema.workspaces).where(eq(schema.workspaces.id, wsB));
  });

  it("creates a profile row through the auth trigger", async () => {
    const rows = await db
      .select({ id: schema.profiles.id })
      .from(schema.profiles)
      .where(eq(schema.profiles.id, userA));
    expect(rows).toHaveLength(1);
  });

  it("only returns the caller's workspaces", async () => {
    const seenByA = await withUserContext(userA, (tx) =>
      tx.select({ id: schema.workspaces.id }).from(schema.workspaces),
    );
    expect(seenByA.map((r) => r.id)).toEqual([wsA]);

    const seenByB = await withUserContext(userB, (tx) =>
      tx.select({ id: schema.workspaces.id }).from(schema.workspaces),
    );
    expect(seenByB.map((r) => r.id)).toEqual([wsB]);
  });

  it("hides other workspaces' members and profiles", async () => {
    const members = await withUserContext(userA, (tx) =>
      tx
        .select({ userId: schema.workspaceMembers.userId })
        .from(schema.workspaceMembers),
    );
    expect(members.map((m) => m.userId)).toEqual([userA]);

    const profilesSeen = await withUserContext(userA, (tx) =>
      tx.select({ id: schema.profiles.id }).from(schema.profiles),
    );
    expect(profilesSeen.map((p) => p.id)).toEqual([userA]);
  });

  it("allows writes only inside the caller's workspace", async () => {
    const inserted = await withUserContext(userA, (tx) =>
      tx
        .insert(schema.contacts)
        .values({ workspaceId: wsA, fullName: "Own contact" })
        .returning({ id: schema.contacts.id }),
    );
    expect(inserted).toHaveLength(1);

    await expectRlsViolation(
      withUserContext(userA, (tx) =>
        tx
          .insert(schema.contacts)
          .values({ workspaceId: wsB, fullName: "Foreign contact" }),
      ),
    );
  });

  it("enforces the role matrix in Postgres (assistant cannot invite)", async () => {
    await expectRlsViolation(
      withUserContext(userB, (tx) =>
        tx.insert(schema.invites).values({
          workspaceId: wsB,
          email: "x@test.temas",
          role: "agent",
          token: `t-${Date.now()}`,
          expiresAt: new Date(Date.now() + 1000),
        }),
      ),
    );
  });

  it("keeps activity_log append-only for users", async () => {
    const [row] = await withUserContext(userA, (tx) =>
      tx
        .insert(schema.activityLog)
        .values({ workspaceId: wsA, actorId: userA, action: "test.event" })
        .returning({ id: schema.activityLog.id }),
    );
    expect(row?.id).toBeTruthy();

    const deleted = await withUserContext(userA, (tx) =>
      tx
        .delete(schema.activityLog)
        .where(eq(schema.activityLog.id, row!.id))
        .returning({ id: schema.activityLog.id }),
    );
    expect(deleted).toHaveLength(0);
  });

  it("scopes properties to the caller's workspace", async () => {
    const [own] = await withUserContext(userA, (tx) =>
      tx
        .insert(schema.properties)
        .values({
          workspaceId: wsA,
          type: "apartment",
          title: "A loft",
        })
        .returning({ id: schema.properties.id }),
    );
    expect(own?.id).toBeTruthy();

    const seenByB = await withUserContext(userB, (tx) =>
      tx.select({ id: schema.properties.id }).from(schema.properties),
    );
    expect(seenByB.map((r) => r.id)).not.toContain(own!.id);

    await expectRlsViolation(
      withUserContext(userB, (tx) =>
        tx.insert(schema.properties).values({
          workspaceId: wsA,
          type: "house",
          title: "Foreign insert",
        }),
      ),
    );
  });

  it("lets a joined tenant read the property but not write inventory", async () => {
    const [prop] = await db
      .insert(schema.properties)
      .values({
        workspaceId: wsA,
        type: "office",
        title: "Shared office",
      })
      .returning({ id: schema.properties.id });

    const [contact] = await db
      .insert(schema.contacts)
      .values({
        workspaceId: wsA,
        userId: userB,
        fullName: "Tenant B",
        email: "tenant-b@test.temas",
      })
      .returning({ id: schema.contacts.id });

    await db.insert(schema.propertyPeople).values({
      propertyId: prop!.id,
      contactId: contact!.id,
      relation: "current_tenant",
      joinedAt: new Date(),
    });

    const seen = await withUserContext(userB, (tx) =>
      tx
        .select({ id: schema.properties.id, title: schema.properties.title })
        .from(schema.properties)
        .where(eq(schema.properties.id, prop!.id)),
    );
    expect(seen).toEqual([{ id: prop!.id, title: "Shared office" }]);

    await expectRlsViolation(
      withUserContext(userB, (tx) =>
        tx.insert(schema.inventoryItems).values({
          propertyId: prop!.id,
          name: "Sneaky chair",
        }),
      ),
    );
  });

  it("blocks assistant hard-deletes of properties", async () => {
    const assistant = "cccccccc-0000-4000-8000-00000000000c";
    await createAuthUser(assistant, "rls-c@test.temas");
    await db.insert(schema.workspaceMembers).values({
      workspaceId: wsA,
      userId: assistant,
      role: "assistant",
    });

    const [prop] = await withUserContext(userA, (tx) =>
      tx
        .insert(schema.properties)
        .values({
          workspaceId: wsA,
          type: "shop",
          title: "Assistant cannot delete",
        })
        .returning({ id: schema.properties.id }),
    );

    const deleted = await withUserContext(assistant, (tx) =>
      tx
        .delete(schema.properties)
        .where(eq(schema.properties.id, prop!.id))
        .returning({ id: schema.properties.id }),
    );
    expect(deleted).toHaveLength(0);

    await db.execute(sql`delete from auth.users where id = ${assistant}::uuid`);
  });

  it("hides other workspaces' conversations, contracts, reminders and applications", async () => {
    const [prop] = await withUserContext(userA, (tx) =>
      tx
        .insert(schema.properties)
        .values({
          workspaceId: wsA,
          type: "apartment",
          title: "RLS contract loft",
        })
        .returning({ id: schema.properties.id }),
    );

    const [conversation] = await withUserContext(userA, (tx) =>
      tx
        .insert(schema.conversations)
        .values({
          workspaceId: wsA,
          userId: userA,
          channel: "email",
          subject: "Private thread",
        })
        .returning({ id: schema.conversations.id }),
    );

    const [contract] = await withUserContext(userA, (tx) =>
      tx
        .insert(schema.contracts)
        .values({
          propertyId: prop!.id,
          bodyMd: "# Draft",
        })
        .returning({ id: schema.contracts.id }),
    );

    const [reminder] = await withUserContext(userA, (tx) =>
      tx
        .insert(schema.reminders)
        .values({
          workspaceId: wsA,
          userId: userA,
          kind: "unanswered_message",
          message: "Follow up",
          dueAt: new Date(),
        })
        .returning({ id: schema.reminders.id }),
    );

    const [contact] = await withUserContext(userA, (tx) =>
      tx
        .insert(schema.contacts)
        .values({
          workspaceId: wsA,
          fullName: "RLS Applicant",
          email: `rls-app-${Date.now()}@test.temas`,
        })
        .returning({ id: schema.contacts.id }),
    );

    const [application] = await withUserContext(userA, (tx) =>
      tx
        .insert(schema.applications)
        .values({
          propertyId: prop!.id,
          contactId: contact!.id,
        })
        .returning({ id: schema.applications.id }),
    );

    const seenConv = await withUserContext(userB, (tx) =>
      tx.select({ id: schema.conversations.id }).from(schema.conversations),
    );
    expect(seenConv.map((r) => r.id)).not.toContain(conversation!.id);

    const seenContracts = await withUserContext(userB, (tx) =>
      tx.select({ id: schema.contracts.id }).from(schema.contracts),
    );
    expect(seenContracts.map((r) => r.id)).not.toContain(contract!.id);

    const seenReminders = await withUserContext(userB, (tx) =>
      tx.select({ id: schema.reminders.id }).from(schema.reminders),
    );
    expect(seenReminders.map((r) => r.id)).not.toContain(reminder!.id);

    const seenApplications = await withUserContext(userB, (tx) =>
      tx.select({ id: schema.applications.id }).from(schema.applications),
    );
    expect(seenApplications.map((r) => r.id)).not.toContain(application!.id);

    await expectRlsViolation(
      withUserContext(userB, (tx) =>
        tx.insert(schema.conversations).values({
          workspaceId: wsA,
          userId: userB,
          channel: "email",
          subject: "Foreign thread",
        }),
      ),
    );

    await expectRlsViolation(
      withUserContext(userB, (tx) =>
        tx.insert(schema.contracts).values({
          propertyId: prop!.id,
          bodyMd: "# Foreign",
        }),
      ),
    );

    await expectRlsViolation(
      withUserContext(userB, (tx) =>
        tx.insert(schema.reminders).values({
          workspaceId: wsA,
          kind: "booking_soon",
          message: "Foreign reminder",
          dueAt: new Date(),
        }),
      ),
    );

    await expectRlsViolation(
      withUserContext(userB, (tx) =>
        tx.insert(schema.applications).values({
          propertyId: prop!.id,
          contactId: contact!.id,
        }),
      ),
    );
  });

  it("hides a coworker's mailbox in the same workspace", async () => {
    const { countUnread, listConversations } =
      await import("@/lib/inbox/queries");
    const peer = "dddddddd-0000-4000-8000-00000000000d";
    await createAuthUser(peer, "rls-d@test.temas");
    await db.insert(schema.workspaceMembers).values({
      workspaceId: wsA,
      userId: peer,
      role: "agent",
    });

    const [mine] = await withUserContext(userA, (tx) =>
      tx
        .insert(schema.conversations)
        .values({
          workspaceId: wsA,
          userId: userA,
          channel: "email",
          subject: "Owner mailbox",
        })
        .returning({ id: schema.conversations.id }),
    );
    const [theirs] = await withUserContext(peer, (tx) =>
      tx
        .insert(schema.conversations)
        .values({
          workspaceId: wsA,
          userId: peer,
          channel: "email",
          subject: "Agent mailbox",
        })
        .returning({ id: schema.conversations.id }),
    );

    const seenByOwner = await withUserContext(userA, (tx) =>
      tx.select({ id: schema.conversations.id }).from(schema.conversations),
    );
    expect(seenByOwner.map((r) => r.id)).toContain(mine!.id);
    expect(seenByOwner.map((r) => r.id)).not.toContain(theirs!.id);

    const listed = await withUserContext(userA, (tx) =>
      listConversations(tx, wsA, userA),
    );
    expect(listed.map((r) => r.id)).toContain(mine!.id);
    expect(listed.map((r) => r.id)).not.toContain(theirs!.id);

    const unread = await withUserContext(userA, (tx) =>
      countUnread(tx, wsA, userA),
    );
    expect(unread).toBeGreaterThanOrEqual(1);

    const peerUnread = await withUserContext(peer, (tx) =>
      countUnread(tx, wsA, peer),
    );
    expect(peerUnread).toBeGreaterThanOrEqual(1);

    const [gmail] = await withUserContext(peer, (tx) =>
      tx
        .insert(schema.integrations)
        .values({
          userId: peer,
          workspaceId: wsA,
          kind: "gmail",
          status: "connected",
        })
        .returning({ id: schema.integrations.id }),
    );
    const integrationsSeen = await withUserContext(userA, (tx) =>
      tx.select({ id: schema.integrations.id }).from(schema.integrations),
    );
    expect(integrationsSeen.map((r) => r.id)).not.toContain(gmail!.id);

    await db.execute(sql`delete from auth.users where id = ${peer}::uuid`);
  });

  it("hides a coworker's suggested tasks until they are accepted", async () => {
    const peer = "eeeeeeee-0000-4000-8000-00000000000e";
    await createAuthUser(peer, "rls-e@test.temas");
    await db.insert(schema.workspaceMembers).values({
      workspaceId: wsA,
      userId: peer,
      role: "agent",
    });

    const [suggestion] = await withUserContext(peer, (tx) =>
      tx
        .insert(schema.tasks)
        .values({
          workspaceId: wsA,
          title: "Call the owner about keys",
          status: "suggested",
          source: "ai",
          assigneeId: peer,
          createdBy: peer,
          userId: peer,
          fingerprint: "call the owner about keys",
        })
        .returning({ id: schema.tasks.id }),
    );
    const [openTask] = await withUserContext(userA, (tx) =>
      tx
        .insert(schema.tasks)
        .values({
          workspaceId: wsA,
          title: "Send the contract draft",
          status: "open",
          assigneeId: userA,
          createdBy: userA,
        })
        .returning({ id: schema.tasks.id }),
    );

    const seenByOwner = await withUserContext(userA, (tx) =>
      tx.select({ id: schema.tasks.id }).from(schema.tasks),
    );
    expect(seenByOwner.map((r) => r.id)).toContain(openTask!.id);
    expect(seenByOwner.map((r) => r.id)).not.toContain(suggestion!.id);

    const seenByPeer = await withUserContext(peer, (tx) =>
      tx.select({ id: schema.tasks.id }).from(schema.tasks),
    );
    expect(seenByPeer.map((r) => r.id)).toContain(suggestion!.id);
    expect(seenByPeer.map((r) => r.id)).toContain(openTask!.id);

    await withUserContext(peer, (tx) =>
      tx
        .update(schema.tasks)
        .set({ status: "open", userId: null, assigneeId: peer })
        .where(eq(schema.tasks.id, suggestion!.id)),
    );
    const afterAccept = await withUserContext(userA, (tx) =>
      tx.select({ id: schema.tasks.id }).from(schema.tasks),
    );
    expect(afterAccept.map((r) => r.id)).toContain(suggestion!.id);

    await db.execute(sql`
      delete from public.tasks
      where assignee_id = ${peer}::uuid
         or created_by = ${peer}::uuid
         or user_id = ${peer}::uuid
    `);
    await db.execute(sql`delete from auth.users where id = ${peer}::uuid`);
  });
});
