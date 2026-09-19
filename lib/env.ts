import { z } from "zod";

/**
 * Validated server environment. Every external integration exposes an
 * `isConfigured` flag so missing keys degrade to dev-mode instead of crashing
 * (docs/02 §4, master plan "working without external services").
 */
const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Temas <noreply@temas.local>"),
  /** Product-feedback inbox. Empty: Mailpit locally (no Resend), required with Resend / in production. */
  FEEDBACK_TO: z.string().trim().optional(),
  /** Dev fallback: Mailpit SMTP from the local Supabase stack. */
  SMTP_HOST: z.string().default("127.0.0.1"),
  SMTP_PORT: z.coerce.number().default(54325),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  /** Gmail users.watch Pub/Sub topic. Empty = poll-only (history.list / cron). */
  GMAIL_PUBSUB_TOPIC: z.string().optional(),

  META_WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  META_WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  META_WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  META_WHATSAPP_APP_SECRET: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

function duringNextBuild() {
  return process.env.NEXT_PHASE === "phase-production-build";
}

export function env(): ServerEnv {
  if (cached && process.env.NODE_ENV === "production") return cached;
  const parsed = serverSchema.safeParse({
    ...process.env,
    // Collecting page data must not require a live database.
    ...(duringNextBuild() && !process.env.DATABASE_URL
      ? { DATABASE_URL: "postgresql://127.0.0.1/temas-build" }
      : null),
  });
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const integrations = {
  resend: () => Boolean(env().RESEND_API_KEY),
  gmail: () => Boolean(env().GOOGLE_CLIENT_ID && env().GOOGLE_CLIENT_SECRET),
  gmailPubsub: () => Boolean(env().GMAIL_PUBSUB_TOPIC),
  whatsapp: () =>
    Boolean(
      env().META_WHATSAPP_PHONE_NUMBER_ID && env().META_WHATSAPP_ACCESS_TOKEN,
    ),
  anthropic: () => Boolean(env().ANTHROPIC_API_KEY),
  openai: () => Boolean(env().OPENAI_API_KEY),
  inngestCloud: () => Boolean(env().INNGEST_EVENT_KEY),
} as const;

export const isProduction = () => process.env.NODE_ENV === "production";
