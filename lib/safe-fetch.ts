import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Outbound fetch for user-supplied URLs (listing import, docs/05 §2.6).
 * https only, private / loopback / link-local targets refused after DNS
 * resolution, every redirect re-checked, bounded time and size.
 */
export class SafeFetchError extends Error {
  constructor(
    public code:
      | "invalid_url"
      | "blocked_host"
      | "too_many_redirects"
      | "bad_status"
      | "bad_type"
      | "too_large"
      | "timeout"
      | "network",
  ) {
    super(code);
  }
}

const MAX_REDIRECTS = 3;

function ipv4Private(ip: string) {
  const [a = 0, b = 0] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return ipv4Private(ip);
  if (kind !== 6) return true;
  const lower = ip.toLowerCase();
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return ipv4Private(mapped[1]!);
  return (
    lower === "::" ||
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb") ||
    lower.startsWith("ff")
  );
}

export function parsePublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new SafeFetchError("invalid_url");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new SafeFetchError("invalid_url");
  }
  if (url.port && url.port !== "443") throw new SafeFetchError("blocked_host");
  return url;
}

async function assertPublicHost(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new SafeFetchError("blocked_host");
  }
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true }).catch(() => {
        throw new SafeFetchError("network");
      });
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new SafeFetchError("blocked_host");
  }
}

export async function safeFetch(
  raw: string,
  opts: {
    maxBytes: number;
    accept: (contentType: string) => boolean;
    timeoutMs?: number;
  },
): Promise<{ url: URL; contentType: string; body: Buffer }> {
  let url = parsePublicUrl(raw);
  const signal = AbortSignal.timeout(opts.timeoutMs ?? 10_000);

  for (let hop = 0; ; hop++) {
    await assertPublicHost(url);
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal,
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; TemasListingImport/1.0)",
          accept: "text/html,application/xhtml+xml,image/*;q=0.9,*/*;q=0.5",
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new SafeFetchError("timeout");
      }
      throw new SafeFetchError("network");
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location || hop >= MAX_REDIRECTS) {
        throw new SafeFetchError("too_many_redirects");
      }
      url = parsePublicUrl(new URL(location, url).toString());
      continue;
    }
    if (!res.ok || !res.body) throw new SafeFetchError("bad_status");

    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!opts.accept(contentType)) throw new SafeFetchError("bad_type");
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > opts.maxBytes) throw new SafeFetchError("too_large");

    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = res.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > opts.maxBytes) {
          await reader.cancel();
          throw new SafeFetchError("too_large");
        }
        chunks.push(value);
      }
    } catch (error) {
      if (error instanceof SafeFetchError) throw error;
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new SafeFetchError("timeout");
      }
      throw new SafeFetchError("network");
    }
    return { url, contentType, body: Buffer.concat(chunks) };
  }
}
