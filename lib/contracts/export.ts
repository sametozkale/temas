import { createRequire } from "node:module";

import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";

import { markdownToBlocks, type MarkdownBlock } from "@/lib/contracts/markdown";

export type ContractExport = {
  docx: Buffer;
  pdf: Buffer;
};

type PdfMakeNode = {
  setFonts: (fonts: Record<string, Record<string, string>>) => void;
  setUrlAccessPolicy: (cb: (url: string) => boolean) => void;
  setLocalAccessPolicy: (cb: (path: string) => boolean) => void;
  createPdf: (doc: TDocumentDefinitions) => {
    getBuffer: () => Promise<Buffer>;
  };
};

const require = createRequire(import.meta.url);
const pdfMake = require("pdfmake") as PdfMakeNode;
pdfMake.setFonts({
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
});
pdfMake.setUrlAccessPolicy(() => false);
pdfMake.setLocalAccessPolicy(() => true);

export async function exportContractDocuments(
  title: string,
  markdown: string,
): Promise<ContractExport> {
  const blocks = markdownToBlocks(markdown);
  const [docx, pdf] = await Promise.all([
    buildDocx(title, blocks),
    buildPdf(title, blocks),
  ]);
  return { docx, pdf };
}

async function buildDocx(title: string, blocks: MarkdownBlock[]) {
  const children =
    blocks.length === 0
      ? [new Paragraph({ text: title })]
      : blocks.map((block) => {
          if (block.kind === "h1") {
            return new Paragraph({
              text: block.text,
              heading: HeadingLevel.HEADING_1,
            });
          }
          if (block.kind === "h2") {
            return new Paragraph({
              text: block.text,
              heading: HeadingLevel.HEADING_2,
            });
          }
          return new Paragraph({
            children: [new TextRun({ text: block.text, size: 22 })],
            spacing: { after: 200 },
          });
        });
  const doc = new Document({
    sections: [{ children }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

function buildPdf(title: string, blocks: MarkdownBlock[]): Promise<Buffer> {
  const content: Content[] =
    blocks.length === 0
      ? [{ text: title, style: "h1" }]
      : blocks.map((block) => {
          if (block.kind === "h1") return { text: block.text, style: "h1" };
          if (block.kind === "h2") return { text: block.text, style: "h2" };
          return { text: block.text, style: "p" };
        });
  const definition: TDocumentDefinitions = {
    info: { title },
    pageMargins: [48, 56, 48, 56],
    defaultStyle: { font: "Helvetica", fontSize: 11, lineHeight: 1.35 },
    styles: {
      h1: { fontSize: 18, bold: true, margin: [0, 0, 0, 12] },
      h2: { fontSize: 13, bold: true, margin: [0, 12, 0, 6] },
      p: { margin: [0, 0, 0, 8] },
    },
    content,
  };
  return pdfMake.createPdf(definition).getBuffer();
}
