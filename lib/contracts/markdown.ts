export type MarkdownBlock =
  | { kind: "h1" | "h2" | "p"; text: string }
  | { kind: "ul"; items: string[] };

export function markdownToBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let buffer: string[] = [];
  let items: string[] = [];
  function flushParagraph() {
    const text = buffer.join(" ").trim();
    buffer = [];
    if (text) blocks.push({ kind: "p", text });
  }
  function flushList() {
    if (items.length === 0) return;
    blocks.push({ kind: "ul", items });
    items = [];
  }
  function flush() {
    flushParagraph();
    flushList();
  }
  for (const line of lines) {
    const bullet = /^[-*]\s+(.+)$/.exec(line.trim());
    if (line.startsWith("# ")) {
      flush();
      blocks.push({ kind: "h1", text: line.slice(2).trim() });
    } else if (line.startsWith("## ")) {
      flush();
      blocks.push({ kind: "h2", text: line.slice(3).trim() });
    } else if (bullet) {
      flushParagraph();
      items.push(bullet[1].trim());
    } else if (line.trim() === "") {
      flush();
    } else {
      flushList();
      buffer.push(line.trim());
    }
  }
  flush();
  return blocks;
}
