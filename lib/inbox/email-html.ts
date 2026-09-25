const QUOTE_MARKERS = [
  /<div[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>/i,
  /<blockquote\b/i,
  /<div[^>]*id="appendonsend"[^>]*>/i,
  /<div[^>]*id="divRplyFwdMsg"[^>]*>/i,
  /<div[^>]*class="[^"]*moz-cite-prefix[^"]*"[^>]*>/i,
];

const PLAIN_QUOTE = /\n(?:On .+ wrote:|-{2,}\s*Original Message\s*-{2,})/i;

function visibleText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** New writing first; the earlier thread stays out of the way until asked for. */
export function splitQuotedHtml(html: string): {
  fresh: string;
  quoted: string | null;
} {
  let index = -1;
  for (const marker of QUOTE_MARKERS) {
    const match = marker.exec(html);
    if (match && (index === -1 || match.index < index)) index = match.index;
  }
  if (index <= 0) return { fresh: html, quoted: null };
  const fresh = html.slice(0, index).trim();
  const quoted = html.slice(index).trim();
  if (!quoted || visibleText(fresh).length === 0) {
    return { fresh: html, quoted: null };
  }
  return { fresh, quoted };
}

export function splitQuotedText(body: string): {
  fresh: string;
  quoted: string | null;
} {
  const match = PLAIN_QUOTE.exec(body);
  if (!match || match.index <= 0) return { fresh: body, quoted: null };
  const fresh = body.slice(0, match.index).trim();
  const quoted = body.slice(match.index).trim();
  if (!fresh || !quoted) return { fresh: body, quoted: null };
  return { fresh, quoted };
}

export function messageSnippet(body: string | null, html: string | null) {
  const text = html
    ? visibleText(splitQuotedHtml(html).fresh)
    : splitQuotedText(body ?? "")
        .fresh.replace(/\s+/g, " ")
        .trim();
  return text.slice(0, 160);
}

/** Strip active content before an email is shown in a sandboxed frame. */
export function prepareEmailHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, ' $1="#"');
}

export function emailSrcDoc(html: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="light">
<base target="_blank">
<style>
  html, body { margin: 0; padding: 0; background: #fff; color-scheme: light; }
</style>
</head>
<body>${prepareEmailHtml(html)}</body>
</html>`;
}
