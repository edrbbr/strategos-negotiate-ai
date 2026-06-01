import * as pdfjs from "pdfjs-dist/webpack.mjs";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

export type KnowledgeChunkInput = {
  page: number;
  chapter: string | null;
  chunk_index: number;
  content: string;
};

function detectChapter(lines: string[], currentChapter: string | null) {
  let chapter = currentChapter;

  for (const line of lines.slice(0, 5)) {
    const text = line.trim();
    if (
      /^(chapter|kapitel|law)\s+\d+/i.test(text) ||
      (text.length > 3 && text.length < 60 && text === text.toUpperCase() && /[A-Z]/.test(text))
    ) {
      chapter = text.slice(0, 80);
      break;
    }
  }

  return chapter;
}

function chunkPageText(pageText: string, page: number, startIndex: number, currentChapter: string | null) {
  const chunks: KnowledgeChunkInput[] = [];
  const lines = pageText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const chapter = detectChapter(lines, currentChapter);
  const clean = pageText.replace(/\s+/g, " ").trim();

  if (!clean) {
    return { chunks, chapter };
  }

  let index = startIndex;
  let cursor = 0;

  while (cursor < clean.length) {
    const end = Math.min(cursor + CHUNK_SIZE, clean.length);
    const content = clean.slice(cursor, end).trim();

    if (content.length > 80) {
      chunks.push({
        page,
        chapter,
        chunk_index: index,
        content,
      });
      index += 1;
    }

    if (end >= clean.length) break;
    cursor = end - CHUNK_OVERLAP;
  }

  return { chunks, chapter };
}

type PdfTextItem = { str?: string; hasEOL?: boolean };
type PdfPageLike = { getTextContent: () => Promise<{ items: PdfTextItem[] }> };

async function extractPageText(page: PdfPageLike) {
  const textContent = await page.getTextContent();
  const lines: string[] = [];
  let currentLine = "";

  for (const item of textContent.items) {
    const value = item.str?.trim();
    if (value) {
      currentLine += `${currentLine ? " " : ""}${value}`;
    }

    if (item.hasEOL && currentLine.trim()) {
      lines.push(currentLine.trim());
      currentLine = "";
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines.join("\n");
}

export async function extractKnowledgeChunksFromPdf(
  file: Blob,
  onPage?: (pageNumber: number, totalPages: number) => void,
) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;
  const chunks: KnowledgeChunkInput[] = [];

  let chapter: string | null = null;
  let chunkIndex = 0;

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const pageText = await extractPageText(page);
      const result = chunkPageText(pageText, pageNumber, chunkIndex, chapter);

      chunks.push(...result.chunks);
      chapter = result.chapter;
      chunkIndex += result.chunks.length;

      page.cleanup();
      onPage?.(pageNumber, pdf.numPages);
    }
  } finally {
    await loadingTask.destroy();
  }

  return chunks;
}