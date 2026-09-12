export type MarkdownBlock = { kind: "h1" | "h2" | "p"; text: string };

export function markdownToBlocks(markdown: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let buffer: string[] = [];
  function flush() {
    const text = buffer.join(" ").trim();
    buffer = [];
    if (text) blocks.push({ kind: "p", text });
  }
  for (const line of lines) {
    if (line.startsWith("# ")) {
      flush();
      blocks.push({ kind: "h1", text: line.slice(2).trim() });
    } else if (line.startsWith("## ")) {
      flush();
      blocks.push({ kind: "h2", text: line.slice(3).trim() });
    } else if (line.trim() === "") {
      flush();
    } else {
      buffer.push(line.trim());
    }
  }
  flush();
  return blocks;
}
