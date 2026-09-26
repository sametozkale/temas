import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_SECONDS = 300;

function signingKey(secret: string): Buffer | string {
  if (secret.startsWith("whsec_")) {
    return Buffer.from(secret.slice("whsec_".length), "base64");
  }
  return secret;
}

/** Stripe-Signature: `t=<unix>,v1=<hex>`. */
export function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
  now = Date.now(),
): boolean {
  const parts = new Map(
    header.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value ?? ""] as const;
    }),
  );
  const timestamp = parts.get("t");
  const signature = parts.get("v1");
  if (!timestamp || !signature) return false;
  const sent = Number(timestamp);
  if (!Number.isFinite(sent)) return false;
  if (Math.abs(now / 1000 - sent) > TOLERANCE_SECONDS) return false;
  const expected = createHmac("sha256", signingKey(secret))
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
