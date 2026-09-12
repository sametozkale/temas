import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { and, eq, inArray, sql } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";

import { ensureContractTemplates } from "@/lib/contracts/queries";
import { db } from "@/lib/db";
import {
  applications,
  availabilityWindows,
  bookings,
  contacts,
  conversations,
  formSubmissions,
  forms,
  messages,
  ownerViews,
  profiles,
  properties,
  reminders,
  viewingCalendars,
  viewingSlots,
  workspaceMembers,
  workspaces,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { STAGE_REVIEWING } from "@/lib/pipeline/defaults";
import { ensurePipeline } from "@/lib/pipeline/ensure";
import { secureToken } from "@/lib/slug";
import { minutesToTime } from "@/lib/slots";
import { materializeCalendar } from "@/lib/viewings/materialize";

export const DEMO_SLUG = "havn-demo";
export const DEMO_EMAIL = "demo@havn.test";
export const DEMO_NAME = "Demo Agent";
export const DEMO_TZ = "Europe/Istanbul";

export type DemoSeedResult = {
  email: string;
  workspaceSlug: string;
  workspaceId: string;
  bookingToken: string | null;
  formToken: string | null;
  ownerToken: string | null;
  created: boolean;
};

const SEED_PATH = path.join(process.cwd(), "e2e", ".seed.json");

type DemoProperty = {
  title: string;
  type: "apartment" | "house";
  status: "active" | "viewing_in_progress" | "application_review" | "rented";
  rooms: string;
  rentAmount: string;
  district: string;
  line: string;
  publishCalendar: boolean;
  publishForm: boolean;
};

const DEMO_PROPERTIES: DemoProperty[] = [
  {
    title: "Kadıköy sea-view 2+1",
    type: "apartment",
    status: "active",
    rooms: "2+1",
    rentAmount: "45000",
    district: "Kadıköy",
    line: "Moda Caddesi 12",
    publishCalendar: true,
    publishForm: false,
  },
  {
    title: "Beşiktaş bright loft",
    type: "apartment",
    status: "viewing_in_progress",
    rooms: "1+1",
    rentAmount: "38000",
    district: "Beşiktaş",
    line: "Cihannüma Sokak 8",
    publishCalendar: false,
    publishForm: false,
  },
  {
    title: "Üsküdar family house",
    type: "house",
    status: "application_review",
    rooms: "3+1",
    rentAmount: "62000",
    district: "Üsküdar",
    line: "Salacak Sahil 4",
    publishCalendar: false,
    publishForm: true,
  },
  {
    title: "Cihangir studio",
    type: "apartment",
    status: "rented",
    rooms: "1+0",
    rentAmount: "28000",
    district: "Beyoğlu",
    line: "Sıraselviler 90",
    publishCalendar: false,
    publishForm: false,
  },
];

async function authUserIdByEmail(email: string): Promise<string | null> {
  const result = await db.execute(
    sql`select id::text as id from auth.users where email = ${email} limit 1`,
  );
  const rows = Array.isArray(result)
    ? result
    : ((result as { rows?: { id?: string }[] }).rows ?? []);
  const id = (rows[0] as { id?: string } | undefined)?.id;
  return id ?? null;
}

function adminClient() {
  const key = env().SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to seed");
  }
  return createClient(env().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function destroyDemo(workspaceId: string | null, userId: string | null) {
  if (workspaceId) {
    const propRows = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.workspaceId, workspaceId));
    const ids = propRows.map((p) => p.id);
    if (ids.length) {
      await db.delete(bookings).where(inArray(bookings.propertyId, ids));
    }
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
  }
  if (userId) {
    await db.execute(sql`delete from auth.users where id = ${userId}::uuid`);
  }
}

async function writeSeedFile(result: DemoSeedResult) {
  await mkdir(path.dirname(SEED_PATH), { recursive: true });
  await writeFile(
    SEED_PATH,
    `${JSON.stringify(
      {
        email: result.email,
        workspaceSlug: result.workspaceSlug,
        bookingToken: result.bookingToken,
        formToken: result.formToken,
        ownerToken: result.ownerToken,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function tokensForWorkspace(
  workspaceId: string,
): Promise<Pick<DemoSeedResult, "bookingToken" | "formToken" | "ownerToken">> {
  const [calendar] = await db
    .select({ token: viewingCalendars.publicToken })
    .from(viewingCalendars)
    .innerJoin(properties, eq(properties.id, viewingCalendars.propertyId))
    .where(
      and(
        eq(properties.workspaceId, workspaceId),
        eq(viewingCalendars.isPublished, true),
      ),
    )
    .limit(1);

  const [form] = await db
    .select({ token: forms.publicToken })
    .from(forms)
    .innerJoin(properties, eq(properties.id, forms.propertyId))
    .where(
      and(eq(properties.workspaceId, workspaceId), eq(forms.isPublished, true)),
    )
    .limit(1);

  const [owner] = await db
    .select({ token: ownerViews.publicToken })
    .from(ownerViews)
    .innerJoin(properties, eq(properties.id, ownerViews.propertyId))
    .where(eq(properties.workspaceId, workspaceId))
    .limit(1);

  return {
    bookingToken: calendar?.token ?? null,
    formToken: form?.token ?? null,
    ownerToken: owner?.token ?? null,
  };
}

export async function seedDemo(options: {
  force?: boolean;
}): Promise<DemoSeedResult> {
  const [existingWs] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, DEMO_SLUG))
    .limit(1);
  const existingUser = await authUserIdByEmail(DEMO_EMAIL);

  if (existingWs && !options.force) {
    const tokens = await tokensForWorkspace(existingWs.id);
    const result: DemoSeedResult = {
      email: DEMO_EMAIL,
      workspaceSlug: DEMO_SLUG,
      workspaceId: existingWs.id,
      created: false,
      ...tokens,
    };
    await writeSeedFile(result);
    return result;
  }

  if (options.force) {
    await destroyDemo(existingWs?.id ?? null, existingUser);
  }

  const admin = adminClient();
  let userId = await authUserIdByEmail(DEMO_EMAIL);
  if (!userId) {
    const created = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      email_confirm: true,
      user_metadata: { full_name: DEMO_NAME },
    });
    if (created.error || !created.data.user) {
      throw new Error(created.error?.message ?? "demo_user_create_failed");
    }
    userId = created.data.user.id;
  }

  const [ws] = await db
    .insert(workspaces)
    .values({
      name: "Havn Demo",
      slug: DEMO_SLUG,
      timezone: DEMO_TZ,
    })
    .returning({ id: workspaces.id });
  if (!ws) throw new Error("demo_workspace_insert_failed");

  await db.insert(workspaceMembers).values({
    workspaceId: ws.id,
    userId,
    role: "owner",
  });

  await db
    .insert(profiles)
    .values({ id: userId, fullName: DEMO_NAME })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { fullName: DEMO_NAME },
    });

  const [agentContact] = await db
    .insert(contacts)
    .values({
      workspaceId: ws.id,
      userId,
      fullName: DEMO_NAME,
      email: DEMO_EMAIL,
      emailVerified: true,
    })
    .returning({ id: contacts.id });

  await ensureContractTemplates(db, ws.id);

  let bookingPropertyId: string | null = null;
  let formPropertyId: string | null = null;

  for (const spec of DEMO_PROPERTIES) {
    const [property] = await db
      .insert(properties)
      .values({
        workspaceId: ws.id,
        type: spec.type,
        title: spec.title,
        status: spec.status,
        rooms: spec.rooms,
        rentAmount: spec.rentAmount,
        currency: "TRY",
        timezone: DEMO_TZ,
        address: {
          line: spec.line,
          district: spec.district,
          city: "Istanbul",
          country: "TR",
        },
        description: `${spec.title} in ${spec.district}, Istanbul.`,
      })
      .returning({ id: properties.id });
    if (!property) throw new Error("demo_property_insert_failed");

    const pipeline = await ensurePipeline(db, property.id);
    if (spec.publishForm) {
      await db
        .update(forms)
        .set({ isPublished: true })
        .where(eq(forms.id, pipeline.form.id));
      formPropertyId = property.id;
    }

    const [calendar] = await db
      .insert(viewingCalendars)
      .values({
        propertyId: property.id,
        publicToken: secureToken(),
        isPublished: spec.publishCalendar,
        slotDurationMin: 30,
        bufferMin: 15,
        minNoticeHours: 4,
        maxDaysAhead: 21,
      })
      .returning({ id: viewingCalendars.id });

    await db.insert(availabilityWindows).values({
      viewingCalendarId: calendar!.id,
      participantKind: "agent",
      contactId: agentContact!.id,
      rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
      startTime: minutesToTime(10 * 60),
      endTime: minutesToTime(18 * 60),
      timezone: DEMO_TZ,
    });

    await materializeCalendar(calendar!.id);

    if (spec.publishCalendar) {
      bookingPropertyId = property.id;
    }
  }

  if (bookingPropertyId) {
    const [calendar] = await db
      .select()
      .from(viewingCalendars)
      .where(eq(viewingCalendars.propertyId, bookingPropertyId))
      .limit(1);
    const open = await db
      .select()
      .from(viewingSlots)
      .where(
        and(
          eq(viewingSlots.viewingCalendarId, calendar!.id),
          eq(viewingSlots.status, "open"),
        ),
      )
      .limit(8);

    const slot = open.at(-1);
    if (slot) {
      const [prospect] = await db
        .insert(contacts)
        .values({
          workspaceId: ws.id,
          fullName: "Elif Kaya",
          email: "elif.kaya@example.com",
          phone: "+905551110001",
          emailVerified: true,
        })
        .returning({ id: contacts.id });
      await db
        .update(viewingSlots)
        .set({ status: "booked" })
        .where(eq(viewingSlots.id, slot.id));
      await db.insert(bookings).values({
        viewingSlotId: slot.id,
        propertyId: bookingPropertyId,
        contactId: prospect!.id,
        cancelToken: secureToken(),
        status: "confirmed",
      });
    }

    const [enquiry] = await db
      .insert(contacts)
      .values({
        workspaceId: ws.id,
        fullName: "Mert Yılmaz",
        email: "mert.yilmaz@example.com",
        phone: "+905551110002",
      })
      .returning({ id: contacts.id });

    const [emailThread] = await db
      .insert(conversations)
      .values({
        workspaceId: ws.id,
        channel: "email",
        contactId: enquiry!.id,
        propertyId: bookingPropertyId,
        subject: "Viewing this week?",
        lastMessageAt: new Date(),
        isRead: false,
      })
      .returning({ id: conversations.id });

    await db.insert(messages).values({
      conversationId: emailThread!.id,
      direction: "in",
      body: "Hello, is the Kadıköy sea-view 2+1 still available for a viewing this week?",
      sentAt: new Date(),
      externalId: `seed-email:${ws.id}`,
    });

    const [waThread] = await db
      .insert(conversations)
      .values({
        workspaceId: ws.id,
        channel: "whatsapp",
        contactId: enquiry!.id,
        propertyId: bookingPropertyId,
        subject: "WhatsApp",
        lastMessageAt: new Date(),
        isRead: false,
      })
      .returning({ id: conversations.id });

    await db.insert(messages).values({
      conversationId: waThread!.id,
      direction: "in",
      body: "Hi, can we see the Kadıköy flat on Thursday afternoon?",
      sentAt: new Date(),
      externalId: `seed-wa:${ws.id}`,
    });

    await db.insert(reminders).values({
      workspaceId: ws.id,
      userId,
      kind: "unanswered_message",
      entity: "conversation",
      entityId: emailThread!.id,
      message: "Reply to Mert about the Kadıköy viewing.",
      dueAt: new Date(),
      source: "ai",
    });
  }

  if (formPropertyId) {
    const pipeline = await ensurePipeline(db, formPropertyId);
    const reviewing = pipeline.stages.find((s) => s.name === STAGE_REVIEWING);
    const [applicant] = await db
      .insert(contacts)
      .values({
        workspaceId: ws.id,
        fullName: "Selin Arslan",
        email: "selin.arslan@example.com",
        phone: "+905551110003",
      })
      .returning({ id: contacts.id });
    const [submission] = await db
      .insert(formSubmissions)
      .values({
        formId: pipeline.form.id,
        contactId: applicant!.id,
        answers: {
          income: 85000,
          employment: "Product designer",
          move_in: "2026-10-01",
          pets: "No",
          occupants: 2,
        },
      })
      .returning({ id: formSubmissions.id });
    await db.insert(applications).values({
      propertyId: formPropertyId,
      contactId: applicant!.id,
      submissionId: submission!.id,
      stageId: reviewing?.id ?? pipeline.stages[0]?.id,
      score: 82,
      aiSummary: "Stable income, two occupants, no pets. Strong shortlist.",
    });
  }

  const tokens = await tokensForWorkspace(ws.id);
  const result: DemoSeedResult = {
    email: DEMO_EMAIL,
    workspaceSlug: DEMO_SLUG,
    workspaceId: ws.id,
    created: true,
    ...tokens,
  };
  await writeSeedFile(result);
  return result;
}

export function printSeedResult(result: DemoSeedResult) {
  const base = env().APP_URL.replace(/\/$/, "");
  console.log(
    result.created
      ? "Demo workspace created."
      : "Demo workspace already exists.",
  );
  console.log(`  email:    ${result.email}`);
  console.log(`  slug:     ${result.workspaceSlug}`);
  if (result.bookingToken) {
    console.log(`  booking:  ${base}/b/${result.bookingToken}`);
  }
  if (result.formToken) {
    console.log(`  form:     ${base}/f/${result.formToken}`);
  }
  if (result.ownerToken) {
    console.log(`  owner:    ${base}/o/${result.ownerToken}`);
  }
  console.log(`  wrote:    e2e/.seed.json`);
  if (!result.created) {
    console.log("  Re-run with --force to rebuild the demo workspace.");
  }
}
