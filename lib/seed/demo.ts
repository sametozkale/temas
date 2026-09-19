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
import {
  STAGE_NEW,
  STAGE_REVIEWING,
  STAGE_SHORTLISTED,
} from "@/lib/pipeline/defaults";
import { ensurePipeline } from "@/lib/pipeline/ensure";
import { secureToken } from "@/lib/slug";
import { minutesToTime } from "@/lib/slots";
import { materializeCalendar } from "@/lib/viewings/materialize";

export const DEMO_SLUG = "temas-demo";
export const DEMO_EMAIL = "demo@temas.test";
export const DEMO_NAME = "Demo Agent";
export const DEMO_AGENT_EMAIL = "agent@temas.test";
export const DEMO_AGENT_NAME = "Leyla Agent";
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
  bedrooms: number;
  bathrooms: number;
  areaM2: string;
  floor: number | null;
  totalFloors: number | null;
  yearBuilt: number;
  condition: "new" | "renovated" | "good" | "fair" | "needs_work";
  availableFrom: string | null;
  rentAmount: string;
  duesAmount: string | null;
  features: Record<string, boolean>;
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
    bedrooms: 2,
    bathrooms: 1,
    areaM2: "85",
    floor: 4,
    totalFloors: 6,
    yearBuilt: 2014,
    condition: "renovated",
    availableFrom: "2026-10-01",
    rentAmount: "45000",
    duesAmount: "2500",
    features: {
      furnished: true,
      elevator: true,
      balcony: true,
      dishwasher: true,
      heating_central: true,
    },
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
    bedrooms: 1,
    bathrooms: 1,
    areaM2: "62",
    floor: 2,
    totalFloors: 5,
    yearBuilt: 2008,
    condition: "good",
    availableFrom: "2026-09-15",
    rentAmount: "38000",
    duesAmount: "1800",
    features: {
      furnished: true,
      elevator: true,
      parking: true,
      internet: true,
    },
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
    bedrooms: 3,
    bathrooms: 2,
    areaM2: "140",
    floor: null,
    totalFloors: 2,
    yearBuilt: 1998,
    condition: "good",
    availableFrom: null,
    rentAmount: "62000",
    duesAmount: null,
    features: {
      garden: true,
      parking: true,
      terrace: true,
      pets_allowed: true,
      washing_machine: true,
    },
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
    bedrooms: 1,
    bathrooms: 1,
    areaM2: "38",
    floor: 5,
    totalFloors: 7,
    yearBuilt: 1972,
    condition: "fair",
    availableFrom: null,
    rentAmount: "28000",
    duesAmount: "900",
    features: { furnished: true, elevator: true },
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

async function destroyDemo(workspaceId: string | null, userIds: string[]) {
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
  for (const userId of userIds) {
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
  const existingAgent = await authUserIdByEmail(DEMO_AGENT_EMAIL);

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
    await destroyDemo(
      existingWs?.id ?? null,
      [existingUser, existingAgent].filter((id): id is string => Boolean(id)),
    );
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

  let agentUserId = await authUserIdByEmail(DEMO_AGENT_EMAIL);
  if (!agentUserId) {
    const createdAgent = await admin.auth.admin.createUser({
      email: DEMO_AGENT_EMAIL,
      email_confirm: true,
      user_metadata: { full_name: DEMO_AGENT_NAME },
    });
    if (createdAgent.error || !createdAgent.data.user) {
      throw new Error(
        createdAgent.error?.message ?? "demo_agent_create_failed",
      );
    }
    agentUserId = createdAgent.data.user.id;
  }

  const [ws] = await db
    .insert(workspaces)
    .values({
      name: "Temas Demo",
      legalName: "Temas Demo Gayrimenkul Ltd.",
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
  await db.insert(workspaceMembers).values({
    workspaceId: ws.id,
    userId: agentUserId,
    role: "agent",
  });

  await db
    .insert(profiles)
    .values({ id: userId, fullName: DEMO_NAME })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { fullName: DEMO_NAME },
    });
  await db
    .insert(profiles)
    .values({ id: agentUserId, fullName: DEMO_AGENT_NAME })
    .onConflictDoUpdate({
      target: profiles.id,
      set: { fullName: DEMO_AGENT_NAME },
    });

  const [ownerContact] = await db
    .insert(contacts)
    .values({
      workspaceId: ws.id,
      userId,
      fullName: DEMO_NAME,
      email: DEMO_EMAIL,
      emailVerified: true,
    })
    .returning({ id: contacts.id });
  const [listingAgentContact] = await db
    .insert(contacts)
    .values({
      workspaceId: ws.id,
      userId: agentUserId,
      fullName: DEMO_AGENT_NAME,
      email: DEMO_AGENT_EMAIL,
      emailVerified: true,
    })
    .returning({ id: contacts.id });

  await ensureContractTemplates(db, ws.id);

  let bookingPropertyId: string | null = null;
  let formPropertyId: string | null = null;

  for (const [index, spec] of DEMO_PROPERTIES.entries()) {
    const assignedUserId = index % 2 === 0 ? userId : agentUserId;
    const assignedContactId =
      index % 2 === 0 ? ownerContact!.id : listingAgentContact!.id;
    const [property] = await db
      .insert(properties)
      .values({
        workspaceId: ws.id,
        assignedUserId,
        type: spec.type,
        title: spec.title,
        status: spec.status,
        rooms: spec.rooms,
        bedrooms: spec.bedrooms,
        bathrooms: spec.bathrooms,
        areaM2: spec.areaM2,
        floor: spec.floor,
        totalFloors: spec.totalFloors,
        yearBuilt: spec.yearBuilt,
        condition: spec.condition,
        availableFrom: spec.availableFrom,
        rentAmount: spec.rentAmount,
        duesAmount: spec.duesAmount,
        features: spec.features,
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
      contactId: assignedContactId,
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
        userId,
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
        userId: agentUserId,
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
    const stageId = (name: string) =>
      pipeline.stages.find((s) => s.name === name)?.id ??
      pipeline.stages[0]?.id;

    const families = [
      {
        fullName: "Selin Arslan",
        email: "selin.arslan@example.com",
        phone: "+905551110003",
        stage: STAGE_REVIEWING,
        score: 82,
        aiSummary:
          "Arslan household of two. Stable income, no pets. Strong shortlist.",
        answers: {
          income: 85000,
          employment: "Product designer",
          move_in: "2026-10-01",
          pets: "No",
          occupants: 2,
          household: [{ name: "Kerem Arslan", relation: "partner" }],
        },
      },
      {
        fullName: "Deniz Yılmaz",
        email: "deniz.yilmaz@example.com",
        phone: "+905551110004",
        stage: STAGE_SHORTLISTED,
        score: 91,
        aiSummary:
          "Yılmaz family of three. Dual income, child in local school. Owner-ready.",
        answers: {
          income: 120000,
          employment: "Software engineer",
          move_in: "2026-09-15",
          pets: "No",
          occupants: 3,
          household: [
            { name: "Elif Yılmaz", relation: "partner" },
            { name: "Can Yılmaz", relation: "child" },
          ],
        },
      },
      {
        fullName: "Mert Kaya",
        email: "mert.kaya@example.com",
        phone: "+905551110005",
        stage: STAGE_NEW,
        score: 64,
        aiSummary: "Applying alone. Income covers rent; timing is flexible.",
        answers: {
          income: 48000,
          employment: "Freelance photographer",
          move_in: "2026-11-01",
          pets: "Yes",
          occupants: 1,
        },
      },
    ] as const;

    for (const family of families) {
      const [applicant] = await db
        .insert(contacts)
        .values({
          workspaceId: ws.id,
          fullName: family.fullName,
          email: family.email,
          phone: family.phone,
        })
        .returning({ id: contacts.id });
      const [submission] = await db
        .insert(formSubmissions)
        .values({
          formId: pipeline.form.id,
          contactId: applicant!.id,
          answers: family.answers,
        })
        .returning({ id: formSubmissions.id });
      await db.insert(applications).values({
        propertyId: formPropertyId,
        contactId: applicant!.id,
        submissionId: submission!.id,
        stageId: stageId(family.stage),
        score: family.score,
        aiSummary: family.aiSummary,
      });
    }
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
